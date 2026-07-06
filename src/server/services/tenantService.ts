import {
  ensureDir,
  getTenants,
  listJsonFiles,
  removeTenantDir,
  ServiceError,
  slugify,
  TenantMeta,
  writeTenants,
} from './dataStore.js';
import { apiService } from './apiService.js';
import { eventService } from './eventService.js';
import { fileTemplateService } from './fileTemplateService.js';

export interface TenantSummary {
  apiCount: number;
  eventCount: number;
  fileTemplateCount: number;
}

export const tenantService = {
  async list(): Promise<TenantMeta[]> {
    return getTenants();
  },

  async getOne(tenantId: string): Promise<TenantMeta | null> {
    const tenants = await getTenants();
    return tenants.find((t) => t.id === tenantId) ?? null;
  },

  async summary(tenantId: string): Promise<TenantSummary> {
    const [apis, events, fileTemplates] = await Promise.all([
      listJsonFiles(apiService.folderFor(tenantId)),
      listJsonFiles(eventService.folderFor(tenantId)),
      listJsonFiles(fileTemplateService.folderFor(tenantId)),
    ]);
    return {
      apiCount: apis.length,
      eventCount: events.length,
      fileTemplateCount: fileTemplates.length,
    };
  },

  /**
   * Registers a new tenant: validates the payload, appends it to
   * Tenants/tenants.json, and creates its API / Events / File_Templates
   * folders up front (empty) so the tenant is immediately ready to receive
   * uploads from apiService / eventService / fileTemplateService.
   */
  async register(payload: any): Promise<TenantMeta> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new ServiceError('Tenant JSON must be a single object (not an array).');
    }
    if (!payload.name || typeof payload.name !== 'string') {
      throw new ServiceError('Tenant JSON must include a "name" field.');
    }
    if (payload.description !== undefined && typeof payload.description !== 'string') {
      throw new ServiceError('Tenant "description" must be a string when provided.');
    }

    const tenants = await getTenants();

    let id: string = payload.id && typeof payload.id === 'string' ? payload.id : slugify(payload.name);
    if (tenants.some((t) => t.id === id)) {
      throw new ServiceError(`Tenant '${id}' already exists.`, 409);
    }

    const tenant: TenantMeta = { id, name: payload.name, description: payload.description };

    // Persist the tenant entry first, then create its three category
    // folders so it's immediately ready for apiService/eventService/
    // fileTemplateService uploads.
    await writeTenants([...tenants, tenant]);
    await Promise.all([
      ensureDir(apiService.folderFor(id)),
      ensureDir(eventService.folderFor(id)),
      ensureDir(fileTemplateService.folderFor(id)),
    ]);

    return tenant;
  },

  /**
   * Removes a tenant: deletes its entry from Tenants/tenants.json and
   * recursively deletes its entire data folder (API/, Events/,
   * File_Templates/, and anything else under it). This is destructive and
   * irreversible - all of that tenant's registered items go with it.
   */
  async remove(tenantId: string): Promise<void> {
    const tenants = await getTenants();
    const exists = tenants.some((t) => t.id === tenantId);
    if (!exists) {
      throw new ServiceError(`Tenant '${tenantId}' not found.`, 404);
    }

    await writeTenants(tenants.filter((t) => t.id !== tenantId));
    await removeTenantDir(tenantId);
  },
};