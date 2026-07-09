import { RegistrationService } from './baseRegistrationService.js';
import { ServiceError } from './dataStore.js';
import { expandSimpleApi } from './simpleApiFormat.js';

// Registers APIs for a tenant. Items are written to:
//   <DATA_DIR>/<tenant_id>/API/<id>.json
//
// Accepts a simplified, ABAP-friendly upload format (flat parameter/field
// lists, no OpenAPI "in"/content/schema wrapping) and expands it into the
// richer OpenAPI-ready shape on registration — see simpleApiFormat.ts.
// Already-rich OpenAPI-shaped payloads pass through unchanged.
export const apiService = new RegistrationService({
  label: 'API',
  folderName: 'API',
  transform: expandSimpleApi,
  validate: (payload) => {
    if (!payload.baseUrl || typeof payload.baseUrl !== 'string') {
      throw new ServiceError('API JSON must include a "baseUrl" field.');
    }
    if (payload.endpoints !== undefined && !Array.isArray(payload.endpoints)) {
      throw new ServiceError('API "endpoints" must be an array when provided.');
    }
  },
});