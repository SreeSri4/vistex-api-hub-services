import path from 'path';
import { promises as fs } from 'fs';
import {
  ensureDir,
  listJsonFiles,
  readJsonSafe,
  resolveCategoryDir,
  ServiceError,
  slugify,
  tenantExists,
} from './dataStore.js';

export interface RegistrationServiceOptions {
  /** Human readable label used in error messages, e.g. "API", "Event", "File Template". */
  label: string;
  /** Folder name created under the tenant's directory, e.g. "API", "Events", "File_Templates". */
  folderName: string;
  /**
   * Optional pre-processing step run on the raw incoming payload before
   * validation, e.g. expanding a simplified upstream format (like a flat
   * ABAP-friendly API shape) into the richer canonical shape the app
   * stores and renders. Runs before `validate` and before the "name"/"id"
   * checks, so it can also normalize those fields if needed.
   */
  transform?: (payload: any) => any;
  /** Optional extra validation beyond the common "name"/"id" checks. Throw ServiceError to reject. */
  validate?: (payload: any) => void;
}

/**
 * Generic "register a JSON item under a tenant's category folder" service.
 * Each domain (APIs, Events, File Templates) wraps this with its own folder
 * name and validation rules so they remain distinct services at the call
 * site (apiService.register(...), eventService.register(...), etc.) while
 * sharing the same on-disk folder + JSON file mechanics.
 */
export class RegistrationService {
  private readonly label: string;
  private readonly folderName: string;
  private readonly transform?: (payload: any) => any;
  private readonly validate?: (payload: any) => void;

  constructor(options: RegistrationServiceOptions) {
    this.label = options.label;
    this.folderName = options.folderName;
    this.transform = options.transform;
    this.validate = options.validate;
  }

  folderFor(tenantId: string): string {
    return resolveCategoryDir(tenantId, this.folderName);
  }

  async list(tenantId: string): Promise<any[]> {
    const dir = this.folderFor(tenantId);
    const files = await listJsonFiles(dir);
    const items = await Promise.all(files.map((file) => readJsonSafe<any>(path.join(dir, file))));
    return items.filter((item): item is any => item !== null);
  }

  async getOne(tenantId: string, itemId: string): Promise<any | null> {
    const dir = this.folderFor(tenantId);
    return readJsonSafe<any>(path.join(dir, `${itemId}.json`));
  }

  async remove(tenantId: string, itemId: string): Promise<void> {
    const dir = this.folderFor(tenantId);
    try {
      await fs.unlink(path.join(dir, `${itemId}.json`));
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new ServiceError(`${this.label} '${itemId}' not found.`, 404);
      }
      throw err;
    }
  }

  /**
   * Registers a new item for a tenant: validates the payload, creates the
   * tenant's category folder if it doesn't exist yet, and writes the item
   * out as its own JSON file (<id>.json) inside that folder.
   */
  async register(tenantId: string, payload: any): Promise<any> {
    if (!(await tenantExists(tenantId))) {
      throw new ServiceError(`Unknown tenant '${tenantId}'.`, 404);
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new ServiceError(`${this.label} JSON must be a single object (not an array).`);
    }

    if (this.transform) {
      payload = this.transform(payload);
    }

    if (!payload.name || typeof payload.name !== 'string') {
      throw new ServiceError(`${this.label} JSON must include a "name" field.`);
    }
    if (!payload.id || typeof payload.id !== 'string') {
      payload.id = slugify(payload.name);
    }

    this.validate?.(payload);

    const dir = this.folderFor(tenantId);
    await ensureDir(dir);
    const filePath = path.join(dir, `${payload.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');

    return payload;
  }
}