import path from 'path';
import { promises as fs } from 'fs';
import { ensureDir, listJsonFiles, readJsonSafe, resolveCategoryDir, ServiceError, slugify, tenantExists, } from './dataStore.js';
/**
 * Generic "register a JSON item under a tenant's category folder" service.
 * Each domain (APIs, Events, File Templates) wraps this with its own folder
 * name and validation rules so they remain distinct services at the call
 * site (apiService.register(...), eventService.register(...), etc.) while
 * sharing the same on-disk folder + JSON file mechanics.
 */
export class RegistrationService {
    constructor(options) {
        this.label = options.label;
        this.folderName = options.folderName;
        this.validate = options.validate;
    }
    folderFor(tenantId) {
        return resolveCategoryDir(tenantId, this.folderName);
    }
    async list(tenantId) {
        const dir = this.folderFor(tenantId);
        const files = await listJsonFiles(dir);
        const items = await Promise.all(files.map((file) => readJsonSafe(path.join(dir, file))));
        return items.filter((item) => item !== null);
    }
    async getOne(tenantId, itemId) {
        const dir = this.folderFor(tenantId);
        return readJsonSafe(path.join(dir, `${itemId}.json`));
    }
    async remove(tenantId, itemId) {
        const dir = this.folderFor(tenantId);
        try {
            await fs.unlink(path.join(dir, `${itemId}.json`));
        }
        catch (err) {
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
    async register(tenantId, payload) {
        if (!(await tenantExists(tenantId))) {
            throw new ServiceError(`Unknown tenant '${tenantId}'.`, 404);
        }
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            throw new ServiceError(`${this.label} JSON must be a single object (not an array).`);
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
