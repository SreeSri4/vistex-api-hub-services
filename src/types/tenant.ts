export interface Parameter {
  name: string;
  in: string;
  description?: string;
  required?: boolean;
  schema?: Record<string, any>;
}

export interface RequestBody {
  description?: string;
  required?: boolean;
  content?: Record<string, any>;
}

export interface ResponseEntry {
  description: string;
  content?: Record<string, any>;
}

export interface Endpoint {
  path: string;
  method: string;
  summary: string;
  description?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses?: Record<string, ResponseEntry>;
}

export interface ApiTag {
  name: string;
  description?: string;
}

export interface OAuth2FlowConfig {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes?: Record<string, string>;
}

export interface OAuth2Config {
  flows: {
    authorizationCode?: OAuth2FlowConfig;
    implicit?: OAuth2FlowConfig;
    clientCredentials?: OAuth2FlowConfig;
    password?: OAuth2FlowConfig;
  };
}

export interface ApiSpec {
  id: string;
  name: string;
  description?: string;
  baseUrl?: string;
  version?: string;
  contact?: { name?: string; email?: string };
  license?: { name?: string; url?: string };
  endpoints: Endpoint[];
  tags?: ApiTag[];
  // Optional per-API OAuth2 config. If omitted, the details page falls back
  // to sensible defaults derived from baseUrl so OAuth2 is still selectable
  // in the Authorize dialog; tenants can override with real endpoints here.
  oauth2?: OAuth2Config;
}

export interface Tenant {
  id: string;
  name: string;
  description?: string;
  apis: ApiSpec[];
}

export interface TenantData {
  tenants: Tenant[];
}

// --- New lightweight shapes for the split-JSON, folder-backed data model ---
// (Tenants/tenants.json, <tenant_id>/API/*.json, <tenant_id>/Events/*.json,
// <tenant_id>/File_Templates/*.json — see src/server/index.ts)

// Tenant metadata only, as stored in Tenants/tenants.json. APIs/Events/File
// Templates are fetched separately, per tenant, from their own folders.
export interface TenantMeta {
  id: string;
  name: string;
  description?: string;
}

export interface EventSpec {
  id: string;
  name: string;
  description?: string;
  /** e.g. "Kafka", "Webhook", "SQS", "AMQP" */
  type?: string;
  /** topic / queue / endpoint name this event is published or delivered on */
  channel?: string;
  version?: string;
  payloadSchema?: Record<string, any>;
  tags?: string[];
}

export interface FileTemplateField {
  name: string;
  description?: string;
  required?: boolean;
  type?: string;
}

export interface FileTemplateSpec {
  id: string;
  name: string;
  description?: string;
  /** e.g. "CSV", "XML", "JSON", "Fixed-Width", "EDI" */
  format?: string;
  version?: string;
  fields?: FileTemplateField[];
  sampleContent?: string;
}

export interface TenantSummary {
  apiCount: number;
  eventCount: number;
  fileTemplateCount: number;
}
