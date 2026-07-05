import { getTenants, listJsonFiles, TenantMeta } from './dataStore.js';
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
};
