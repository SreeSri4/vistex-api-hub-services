import { RegistrationService } from './baseRegistrationService.js';
import { ServiceError } from './dataStore.js';

// Registers APIs for a tenant. Items are written to:
//   <DATA_DIR>/<tenant_id>/API/<id>.json
//
// Accepts a simplified, ABAP-friendly upload format (flat parameter/field
// lists, no OpenAPI "in"/content/schema wrapping) — or an already fully
// OpenAPI-shaped payload — and stores it exactly as received, with no
// conversion at registration time. Expansion into the richer OpenAPI-ready
// shape (see simpleApiFormat.ts) now happens on read, at render time, so
// the on-disk file always mirrors exactly what was uploaded.
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