/**
 * ABAP backends don't naturally produce OpenAPI's nested shapes — parameter
 * "in" locations, `content: { "application/json": { schema: {...} } }`
 * wrappers, JSON-Schema `properties` maps. This module accepts a much
 * flatter, generic format instead and expands it into the richer shape
 * Swagger UI needs.
 *
 * NOTE: The registered API JSON is now stored on disk exactly as it was
 * uploaded (see `server/services/apiService.ts` — no `transform` step runs
 * at registration time anymore). This expansion instead runs at *render*
 * time, in `pages/ApiDetailPage.tsx`, immediately before the result is fed
 * into `services/specConverter.ts#convertToOpenAPI`. Already fully
 * OpenAPI-shaped payloads still pass through unchanged either way, so
 * previously-registered files with expanded endpoints keep rendering
 * correctly too.
 *
 * Simple upload shape (per endpoint):
 * {
 *   "path": "/materials/{materialNumber}",
 *   "method": "GET",
 *   "summary": "Get a material",
 *   "description": "...",
 *   "parameters": [
 *     { "name": "materialNumber", "type": "string", "required": true, "description": "Material number" },
 *     { "name": "plant", "type": "string", "description": "Plant code" }
 *   ],
 *   "requestFields":  [ { "name": "description", "type": "string", "required": true } ],
 *   "responses": [
 *     {
 *       "status": 200,
 *       "description": "Material found",
 *       "fields": [
 *         { "name": "materialNumber", "type": "string" },
 *         // nested object — an ABAP nested structure maps directly to this:
 *         { "name": "plant", "type": "object", "fields": [
 *           { "name": "plantId", "type": "string" },
 *           { "name": "name", "type": "string" }
 *         ]},
 *         // array of scalars — an ABAP internal table of a single field:
 *         { "name": "unitsOfMeasure", "type": "array", "itemType": "string" },
 *         // array of objects — an ABAP internal table of a structure:
 *         { "name": "batches", "type": "array", "items": [
 *           { "name": "batchNumber", "type": "string" },
 *           { "name": "quantity", "type": "number" }
 *         ]}
 *       ]
 *     },
 *     { "status": 404, "description": "Material not found" }
 *   ]
 * }
 *
 * - Parameter "in" (path vs query) is inferred automatically from whether
 *   `{name}` appears in the path — callers never need to specify it.
 * - Every field list (`parameters`, `requestFields`, a response's `fields`)
 *   is the same flat `{ name, type, required, description, format, example }`
 *   shape, and each field can itself be:
 *     - a plain scalar (`type: "string" | "integer" | "number" | "boolean"`, the default),
 *     - a nested object (`type: "object"`, with its own `fields` list), or
 *     - an array (`type: "array"`, with either `itemType` for an array of
 *       scalars, or `items` — a field list — for an array of objects).
 *   This nests to any depth, so structures-within-structures and
 *   tables-of-structures (both very natural in ABAP) are expressible.
 *   `format` (e.g. "date", "email") and `example` are carried straight onto
 *   the generated schema at every level, scalar or nested.
 * - `requestBodyDescription` sets the request body's own description
 *   (distinct from any individual field's description).
 * - `responses` is a flat array, one entry per status code, each with its
 *   own optional `fields` list expanded the same way. `status` defaults to
 *   200 if omitted, and if `responses` is omitted entirely a single 200 is
 *   generated automatically (optionally described by `responseFields` /
 *   `responseDescription`, kept as a shorthand for the single-response case).
 *
 * Fully OpenAPI-shaped input (existing `parameters[].in`/`.schema`,
 * `requestBody`, a `responses` object keyed by status code, or a raw
 * JSON-Schema object dropped in as a field's `schema`) still passes
 * straight through unchanged, so previously-registered APIs and any caller
 * that already speaks OpenAPI keep working without modification.
 */
/** Builds the JSON-Schema for a single field, recursing into objects/arrays. */
function fieldToSchema(f) {
    if (f?.schema)
        return f.schema;
    const type = f?.type || 'string';
    const example = f?.example !== undefined ? { example: f.example } : {};
    if (type === 'object') {
        const nested = Array.isArray(f?.fields) && f.fields.length ? buildObjectSchema(f.fields) : { type: 'object' };
        return { ...nested, description: f?.description, ...example };
    }
    if (type === 'array') {
        const itemSchema = Array.isArray(f?.items) && f.items.length
            ? buildObjectSchema(f.items)
            : { type: f?.itemType || 'string' };
        return { type: 'array', description: f?.description, items: itemSchema, ...example };
    }
    return {
        type,
        description: f?.description,
        ...(f?.format ? { format: f.format } : {}),
        ...example,
    };
}
/** Builds a JSON-Schema `object` (with `properties`/`required`) from a flat field list. */
function buildObjectSchema(fields) {
    const properties = {};
    const required = [];
    for (const f of fields) {
        if (!f?.name)
            continue;
        properties[f.name] = fieldToSchema(f);
        if (f.required)
            required.push(f.name);
    }
    return { type: 'object', properties, ...(required.length ? { required } : {}) };
}
function expandParameter(p, path) {
    const inferredIn = p?.in || (p?.name && path.includes(`{${p.name}}`) ? 'path' : 'query');
    const schema = p?.schema ?? fieldToSchema(p ?? {});
    // The parameter object already carries `description` itself — drop the
    // redundant copy we'd otherwise also put on its schema (nested
    // object/array descriptions further down are untouched).
    if (!p?.schema && schema && typeof schema === 'object')
        delete schema.description;
    return {
        name: p?.name,
        in: inferredIn,
        description: p?.description,
        required: p?.required ?? (inferredIn === 'path'),
        schema,
    };
}
function expandRequestBody(endpoint) {
    // Already fully-shaped — pass through as-is.
    if (endpoint.requestBody)
        return endpoint.requestBody;
    const fields = endpoint.requestFields;
    if (!Array.isArray(fields) || fields.length === 0)
        return undefined;
    return {
        description: endpoint.requestBodyDescription,
        required: true,
        content: { 'application/json': { schema: buildObjectSchema(fields) } },
    };
}
function expandOneResponse(r) {
    const status = Number(r?.status ?? 200);
    return {
        description: r?.description || (status >= 200 && status < 300 ? 'Successful response' : 'Error response'),
        ...(Array.isArray(r?.fields) && r.fields.length
            ? { content: { 'application/json': { schema: buildObjectSchema(r.fields) } } }
            : {}),
    };
}
function expandResponses(endpoint) {
    // Already a rich OpenAPI object keyed by status code — pass through as-is.
    if (endpoint.responses && !Array.isArray(endpoint.responses))
        return endpoint.responses;
    // Simple form: a flat array, one entry per status code.
    if (Array.isArray(endpoint.responses) && endpoint.responses.length > 0) {
        const result = {};
        for (const r of endpoint.responses) {
            const status = String(r?.status ?? 200);
            result[status] = expandOneResponse(r);
        }
        return result;
    }
    // Nothing provided — fall back to a single 200, optionally described by
    // the older responseFields/responseDescription shorthand.
    const fields = endpoint.responseFields;
    return {
        200: {
            description: endpoint.responseDescription || 'Successful response',
            ...(Array.isArray(fields) && fields.length
                ? { content: { 'application/json': { schema: buildObjectSchema(fields) } } }
                : {}),
        },
    };
}
function expandEndpoint(e) {
    const method = String(e?.method || 'GET').toUpperCase();
    const path = e?.path || '/';
    return {
        path,
        method,
        summary: e?.summary || `${method} ${path}`,
        description: e?.description,
        tags: e?.tags,
        parameters: Array.isArray(e?.parameters) ? e.parameters.map((p) => expandParameter(p, path)) : undefined,
        requestBody: expandRequestBody(e ?? {}),
        responses: expandResponses(e ?? {}),
    };
}
/**
 * Expands a simplified API upload payload's `endpoints` into the richer
 * shape the app stores and Swagger UI renders. Everything else on the
 * payload (name, id, description, baseUrl, version, contact, license, tags)
 * passes through untouched.
 */
export function expandSimpleApi(payload) {
    if (!payload || typeof payload !== 'object')
        return payload;
    if (!Array.isArray(payload.endpoints))
        return payload;
    return { ...payload, endpoints: payload.endpoints.map(expandEndpoint) };
}
