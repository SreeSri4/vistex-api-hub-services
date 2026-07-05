import { RegistrationService } from './baseRegistrationService.js';
import { ServiceError } from './dataStore.js';

// Registers APIs for a tenant. Items are written to:
//   <DATA_DIR>/<tenant_id>/API/<id>.json
export const apiService = new RegistrationService({
  label: 'API',
  folderName: 'API',
  validate: (payload) => {
    if (!payload.baseUrl || typeof payload.baseUrl !== 'string') {
      throw new ServiceError('API JSON must include a "baseUrl" field.');
    }
    if (payload.endpoints !== undefined && !Array.isArray(payload.endpoints)) {
      throw new ServiceError('API "endpoints" must be an array when provided.');
    }
  },
});