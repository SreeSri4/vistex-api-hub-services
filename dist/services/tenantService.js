import { ensureDir, getTenants, listJsonFiles, ServiceError, slugify, writeTenants } from './dataStore.js';
import { apiService } from './apiService.js';
import { eventService } from './eventService.js';
import { fileTemplateService } from './fileTemplateService.js';
export const tenantService = {
    async list() {
        return getTenants();
    },
    async getOne(tenantId) {
        const tenants = await getTenants();
        return tenants.find((t) => t.id === tenantId) ?? null;
    },
    async summary(tenantId) {
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
    async register(payload) {
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
        let id = payload.id && typeof payload.id === 'string' ? payload.id : slugify(payload.name);
        if (tenants.some((t) => t.id === id)) {
            throw new ServiceError(`Tenant '${id}' already exists.`, 409);
        }
        const tenant = { id, name: payload.name, description: payload.description };
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
};
