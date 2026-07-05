import { getTenants, listJsonFiles } from './dataStore.js';
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
};
