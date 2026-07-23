import type {
  ApiSpec,
  Parameter,
  ApiDiffResult,
  EndpointDiff,
  ParameterDiff,
  RequestBodyDiff,
  ResponseDiff,
  SchemaChange,
} from "../types/tenant";

/**
 * Generates a unique key for an endpoint (method + path).
 */
function endpointKey(endpoint: { path: string; method: string }): string {
  return `${endpoint.method.toUpperCase()}:${endpoint.path}`;
}

/**
 * Deep comparison of two values, returning true if they are equal.
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

/**
 * Recursively compare two JSON Schema objects and return field-level changes.
 * Produces a list of SchemaChange entries describing what changed and where.
 */
function diffSchemas(
  oldSchema: any,
  newSchema: any,
  basePath = ""
): SchemaChange[] {
  if (deepEqual(oldSchema, newSchema)) return [];

  // One is null/undefined, the other isn't
  if (oldSchema == null && newSchema != null) {
    return [{ path: basePath || "(root)", type: "added", newValue: newSchema }];
  }
  if (oldSchema != null && newSchema == null) {
    return [{ path: basePath || "(root)", type: "removed", oldValue: oldSchema }];
  }

  // Primitive type change
  if (typeof oldSchema !== typeof newSchema || Array.isArray(oldSchema) !== Array.isArray(newSchema)) {
    return [{ path: basePath || "(root)", type: "modified", oldValue: oldSchema, newValue: newSchema }];
  }

  // Primitive value
  if (typeof oldSchema !== "object") {
    if (oldSchema !== newSchema) {
      return [{ path: basePath || "(root)", type: "modified", oldValue: oldSchema, newValue: newSchema }];
    }
    return [];
  }

  const changes: SchemaChange[] = [];

  // Compare "properties" for object schemas
  const oldProps: Record<string, any> = oldSchema?.properties ?? {};
  const newProps: Record<string, any> = newSchema?.properties ?? {};
  const allPropKeys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);

  for (const key of allPropKeys) {
    const propPath = basePath ? `${basePath}.${key}` : key;
    const oldVal = oldProps[key];
    const newVal = newProps[key];

    if (oldVal === undefined && newVal !== undefined) {
      changes.push({ path: propPath, type: "added", newValue: newVal });
    } else if (oldVal !== undefined && newVal === undefined) {
      changes.push({ path: propPath, type: "removed", oldValue: oldVal });
    } else {
      changes.push(...diffSchemas(oldVal, newVal, propPath));
    }
  }

  // Compare "required" arrays
  const oldRequired: string[] = oldSchema?.required ?? [];
  const newRequired: string[] = newSchema?.required ?? [];
  if (JSON.stringify(oldRequired.sort()) !== JSON.stringify(newRequired.sort())) {
    changes.push({
      path: basePath ? `${basePath}.required` : "required",
      type: "modified",
      oldValue: oldRequired,
      newValue: newRequired,
    });
  }

  // Compare "type" field
  if (oldSchema?.type !== newSchema?.type) {
    changes.push({
      path: basePath ? `${basePath}.type` : "type",
      type: "modified",
      oldValue: oldSchema?.type,
      newValue: newSchema?.type,
    });
  }

  // Compare "items" for array schemas
  if (oldSchema?.type === "array" || newSchema?.type === "array") {
    const itemChanges = diffSchemas(oldSchema?.items, newSchema?.items, basePath ? `${basePath}.items` : "items");
    changes.push(...itemChanges);
  }

  return changes;
}

/**
 * Compare two parameter arrays and return the differences.
 */
function compareParameters(
  params1: Parameter[] | undefined,
  params2: Parameter[] | undefined
): ParameterDiff[] {
  const p1 = params1 ?? [];
  const p2 = params2 ?? [];
  const diffs: ParameterDiff[] = [];

  const map1 = new Map(p1.map((p) => [`${p.in}:${p.name}`, p]));
  const map2 = new Map(p2.map((p) => [`${p.in}:${p.name}`, p]));

  // Check for removed parameters
  for (const [key, param] of map1) {
    if (!map2.has(key)) {
      diffs.push({ ...param, removed: true });
    }
  }

  // Check for added parameters
  for (const [key, param] of map2) {
    if (!map1.has(key)) {
      diffs.push({ ...param, added: true });
    }
  }

  // Check for modified parameters
  for (const [key, param2] of map2) {
    const param1 = map1.get(key);
    if (param1) {
      const changes: Record<string, { old: any; new: any }> = {};

      if (param1.description !== param2.description) {
        changes.description = { old: param1.description, new: param2.description };
      }
      if (param1.required !== param2.required) {
        changes.required = { old: param1.required, new: param2.required };
      }
      if (!deepEqual(param1.schema, param2.schema)) {
        changes.schema = { old: param1.schema, new: param2.schema };
      }

      if (Object.keys(changes).length > 0) {
        diffs.push({ ...param2, changed: true, changes });
      }
    }
  }

  return diffs;
}

/**
 * Compare two request bodies and return the differences.
 */
function compareRequestBody(
  body1: Record<string, any> | undefined,
  body2: Record<string, any> | undefined
): RequestBodyDiff | undefined {
  if (!body1 && !body2) return undefined;
  if (body1 && !body2) return { removed: true };
  if (!body1 && body2) return { added: true };

  const changes: Record<string, { old: any; new: any }> = {};
  if (body1!.description !== body2!.description) {
    changes.description = { old: body1!.description, new: body2!.description };
  }
  if (body1!.required !== body2!.required) {
    changes.required = { old: body1!.required, new: body2!.required };
  }

  // Deep compare the content field (the schema lives inside content.application/json.schema)
  const contentChanges: SchemaChange[] = [];
  const content1 = body1!.content;
  const content2 = body2!.content;

  if (!deepEqual(content1, content2)) {
    // Try to diff the JSON schema inside content
    const schema1 = content1?.["application/json"]?.schema;
    const schema2 = content2?.["application/json"]?.schema;
    if (schema1 || schema2) {
      contentChanges.push(...diffSchemas(schema1, schema2, "body"));
    } else {
      // Fallback: just note that content changed
      contentChanges.push({ path: "content", type: "modified", oldValue: content1, newValue: content2 });
    }
  }

  const hasChanges = Object.keys(changes).length > 0 || contentChanges.length > 0;
  if (!hasChanges) return undefined;

  return {
    changed: true,
    ...(Object.keys(changes).length > 0 ? { changes } : {}),
    ...(contentChanges.length > 0 ? { contentChanges } : {}),
  };
}

/**
 * Compare two response records and return the differences.
 */
function compareResponses(
  responses1: Record<string, { description: string; content?: Record<string, any> }> | undefined,
  responses2: Record<string, { description: string; content?: Record<string, any> }> | undefined
): ResponseDiff[] {
  const r1 = responses1 ?? {};
  const r2 = responses2 ?? {};
  const diffs: ResponseDiff[] = [];

  const allStatusCodes = new Set([...Object.keys(r1), ...Object.keys(r2)]);

  for (const status of allStatusCodes) {
    const resp1 = r1[status];
    const resp2 = r2[status];

    if (resp1 && !resp2) {
      diffs.push({ statusCode: status, removed: true });
    } else if (!resp1 && resp2) {
      diffs.push({ statusCode: status, added: true });
    } else if (resp1 && resp2) {
      const descriptionChange =
        resp1.description !== resp2.description
          ? { old: resp1.description, new: resp2.description }
          : undefined;

      const schemaChanges = diffSchemas(
        resp1.content?.["application/json"]?.schema,
        resp2.content?.["application/json"]?.schema,
        `${status}`
      );

      if (descriptionChange || schemaChanges.length > 0) {
        diffs.push({
          statusCode: status,
          changed: true,
          ...(descriptionChange ? { descriptionChange } : {}),
          ...(schemaChanges.length > 0 ? { schemaChanged: true, schemaChanges } : {}),
        });
      }
    }
  }

  return diffs;
}

/**
 * Compare two API specs and return a detailed diff result.
 */
export function compareApis(api1: ApiSpec, api2: ApiSpec): ApiDiffResult {
  const endpoints1Map = new Map(api1.endpoints.map((e) => [endpointKey(e), e]));
  const endpoints2Map = new Map(api2.endpoints.map((e) => [endpointKey(e), e]));

  const addedEndpoints: EndpointDiff[] = [];
  const removedEndpoints: EndpointDiff[] = [];
  const modifiedEndpoints: EndpointDiff[] = [];
  const unchangedEndpoints: { path: string; method: string; summary: string }[] = [];

  // Check for added and modified endpoints
  for (const [key, endpoint2] of endpoints2Map) {
    const endpoint1 = endpoints1Map.get(key);

    if (!endpoint1) {
      addedEndpoints.push({
        path: endpoint2.path,
        method: endpoint2.method.toUpperCase(),
        added: true,
      });
    } else {
      const changes: EndpointDiff = {
        path: endpoint2.path,
        method: endpoint2.method.toUpperCase(),
      };

      let hasChanges = false;

      // Compare summary
      if (endpoint1.summary !== endpoint2.summary) {
        changes.summaryChange = { old: endpoint1.summary, new: endpoint2.summary };
        hasChanges = true;
      }

      // Compare description
      if (endpoint1.description !== endpoint2.description) {
        changes.descriptionChange = { old: endpoint1.description, new: endpoint2.description };
        hasChanges = true;
      }

      // Compare parameters
      const paramDiffs = compareParameters(endpoint1.parameters, endpoint2.parameters);
      if (paramDiffs.length > 0) {
        changes.parameterChanges = paramDiffs;
        hasChanges = true;
      }

      // Compare request body
      const bodyDiff = compareRequestBody(
        endpoint1.requestBody as Record<string, any> | undefined,
        endpoint2.requestBody as Record<string, any> | undefined
      );
      if (bodyDiff) {
        changes.requestBodyDiff = bodyDiff;
        hasChanges = true;
      }

      // Compare responses
      const responseDiffs = compareResponses(endpoint1.responses, endpoint2.responses);
      if (responseDiffs.length > 0) {
        changes.responseChanges = responseDiffs;
        hasChanges = true;
      }

      if (hasChanges) {
        changes.changed = true;
        modifiedEndpoints.push(changes);
      } else {
        unchangedEndpoints.push({
          path: endpoint2.path,
          method: endpoint2.method.toUpperCase(),
          summary: endpoint2.summary,
        });
      }
    }
  }

  // Check for removed endpoints
  for (const [key, endpoint1] of endpoints1Map) {
    if (!endpoints2Map.has(key)) {
      removedEndpoints.push({
        path: endpoint1.path,
        method: endpoint1.method.toUpperCase(),
        removed: true,
      });
    }
  }

  return {
    api1,
    api2,
    addedEndpoints,
    removedEndpoints,
    modifiedEndpoints,
    unchangedEndpoints,
    summary: {
      totalChanges: addedEndpoints.length + removedEndpoints.length + modifiedEndpoints.length,
      endpointsAdded: addedEndpoints.length,
      endpointsRemoved: removedEndpoints.length,
      endpointsModified: modifiedEndpoints.length,
    },
  };
}
