import { RegistrationService } from './baseRegistrationService.js';
import { ServiceError } from './dataStore.js';
// Registers File Templates for a tenant. Items are written to:
//   <DATA_DIR>/<tenant_id>/File_Templates/<id>.json
export const fileTemplateService = new RegistrationService({
    label: 'File Template',
    folderName: 'File_Templates',
    validate: (payload) => {
        if (payload.fields !== undefined && !Array.isArray(payload.fields)) {
            throw new ServiceError('File Template "fields" must be an array when provided.');
        }
    },
});
