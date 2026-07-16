import { RegistrationService } from './baseRegistrationService.js';
import { ServiceError } from './dataStore.js';
import { validateApiSpec } from '../../shared/validateApiSpec.js';
// Registers APIs for a tenant. Items are written to:
//   <DATA_DIR>/<tenant_id>/API/<id>.json
//
// The payload is stored exactly as submitted — whether that's the
// simplified, ABAP-friendly format (flat parameter/field lists, no OpenAPI
// "in"/content/schema wrapping) or a fully OpenAPI-shaped payload. No
// expansion happens here. The simplified format is expanded into an
// OpenAPI-ready shape, and that in turn into a full OpenAPI document, only
// at render time in the browser — see src/shared/simpleApiFormat.ts and
// src/services/specConverter.ts, both wired together in ApiDetailPage.tsx.
//
// What DOES happen here is validation: the same expand + convert pipeline
// runs against a real OpenAPI 3.0 schema (src/shared/validateApiSpec.ts),
// so a malformed submission is rejected with a clear error immediately,
// rather than only surfacing later as a broken-looking Swagger UI page.
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
        const { valid, errors } = validateApiSpec(payload);
        if (!valid) {
            throw new ServiceError(`API JSON does not produce a valid OpenAPI document: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? ` (+${errors.length - 3} more)` : ''}`);
        }
    },
});
