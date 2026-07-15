import OpenAPISchemaValidatorPkg from 'openapi-schema-validator';
import { expandSimpleApi } from './simpleApiFormat.js';
import { convertToOpenAPI } from '../services/specConverter.js';

export interface ApiValidationResult {
  valid: boolean;
  /** Human-readable messages, e.g. "paths./materials.get.responses: must have required property '200'". */
  errors: string[];
}

// openapi-schema-validator is CJS (`exports.default = OpenAPISchemaValidator`).
// Vite/esbuild unwrap that automatically for a default import, but Node's
// native ESM loader importing a CJS module does not — it hands back the
// whole `module.exports` object as the "default" import, which here is
// `{ default: Ctor }` rather than `Ctor` itself. This check makes the
// module work correctly whichever environment loads it.
const OpenAPISchemaValidator: any =
  (OpenAPISchemaValidatorPkg as any)?.default ?? OpenAPISchemaValidatorPkg;

const validator = new OpenAPISchemaValidator({ version: 3 });

/**
 * Runs an API payload (simple/ABAP-friendly or already OpenAPI-shaped)
 * through the same two conversions used everywhere else — expandSimpleApi
 * then convertToOpenAPI — and validates the result against the official
 * OpenAPI 3.0 schema. Used both at registration time (apiService.ts, so a
 * malformed submission is rejected immediately) and at render time
 * (ApiDetailPage.tsx, so a spec that slipped through — or was edited
 * directly on disk — surfaces a clear warning instead of silently
 * rendering wrong).
 */
export function validateApiSpec(payload: any): ApiValidationResult {
  try {
    const expanded = expandSimpleApi(payload);
    const spec = convertToOpenAPI(expanded);
    const result = validator.validate(spec as any);

    if (!result.errors || result.errors.length === 0) {
      return { valid: true, errors: [] };
    }

    const errors = result.errors.map((e: any) => {
      const path = e.instancePath || e.dataPath || '';
      return path ? `${path}: ${e.message}` : e.message;
    });
    return { valid: false, errors };
  } catch (err: any) {
    // expandSimpleApi/convertToOpenAPI throwing usually means something
    // more basic is wrong (e.g. endpoints isn't an array) — surface that
    // as a validation error too rather than letting it bubble as a 500.
    return { valid: false, errors: [err?.message ?? 'Failed to build OpenAPI document for validation.'] };
  }
}
