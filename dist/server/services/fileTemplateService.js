import { RegistrationService } from './baseRegistrationService.js';
import { ServiceError } from './dataStore.js';
// Registers File Templates for a tenant. Items are written to:
//   <DATA_DIR>/<tenant_id>/File_Templates/<id>.json
//
// Supports both the older generic shape (format/fields/sampleContent) and
// the richer SAP/ABAP-style shape (apiType/endpoint/application/sections/
// mappings) — see src/types/tenant.ts for both. The payload is stored
// exactly as submitted, same as apiService; no server-side transformation.
export const fileTemplateService = new RegistrationService({
    label: 'File Template',
    folderName: 'File_Templates',
    validate: (payload) => {
        if (payload.fields !== undefined && !Array.isArray(payload.fields)) {
            throw new ServiceError('File Template "fields" must be an array when provided.');
        }
        if (payload.sections !== undefined && !Array.isArray(payload.sections)) {
            throw new ServiceError('File Template "sections" must be an array when provided.');
        }
        if (payload.mappings !== undefined && !Array.isArray(payload.mappings)) {
            throw new ServiceError('File Template "mappings" must be an array when provided.');
        }
        if (Array.isArray(payload.sections)) {
            for (const s of payload.sections) {
                if (!s?.name || typeof s.name !== 'string') {
                    throw new ServiceError('Every entry in "sections" must include a "name".');
                }
            }
        }
        if (Array.isArray(payload.mappings)) {
            for (const m of payload.mappings) {
                if (!m?.sectionName || typeof m.sectionName !== 'string') {
                    throw new ServiceError('Every entry in "mappings" must include a "sectionName".');
                }
                if (!m?.fieldName || typeof m.fieldName !== 'string') {
                    throw new ServiceError('Every entry in "mappings" must include a "fieldName".');
                }
            }
        }
    },
});
