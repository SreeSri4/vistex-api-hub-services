# Vistex API Hub

A centralized web application for managing, exploring, and documenting APIs across multiple tenants. The application provides an intuitive interface to browse tenants, APIs, OpenAPI specifications, events, and file templates while supporting interactive API documentation and specification downloads.

---

## Features

- Multi-tenant API catalog
- Interactive Swagger/OpenAPI documentation
- Tenant summary dashboard
- API details with endpoint documentation
- Event catalog
- File template management
- JSON configuration registration via backend service endpoints
- Download OpenAPI specifications (JSON/YAML)
- Cloud Foundry deployment support
- Modern React + TypeScript UI

---

## Design System

The UI follows a small, consistent set of design tokens rather than ad hoc
styling per page:

- **Type** — `Space Grotesk` for headings/brand/tab labels (`font-display`),
  `Inter` for body text (default sans), `JetBrains Mono` for technical
  strings — base URLs, channels, tenant/API ids (`font-mono`).
- **Color-coded categories** — APIs, Events, and File Templates each carry
  their own accent color everywhere they appear (card left-border, tab pill,
  badges): **blue** `#1D4ED8` for APIs, **violet** `#7C3AED` for Events,
  **amber** `#B45309` for File Templates. The color itself tells you which
  part of the catalog you're in.
- **Persistent app bar** — a slim navy bar (`AppShell`) is shown on every
  route with the product name and a link back to the tenant list.
- **Shared building blocks** (`src/index.css`, `@layer components`) —
  `.catalog-card` / `.catalog-card--interactive` for every list item across
  Tenants/APIs/Events/File Templates, `.btn-primary` / `.btn-secondary` for
  actions, and `.empty-state` for empty-list messaging, so all four catalogs
  look and behave the same way.
- **Accessibility** — a visible `:focus-visible` outline is defined globally
  instead of relying on the browser default, so keyboard navigation stays
  legible against the palette.

---

### Frontend

- React 18
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Swagger UI React

### Backend

- Node.js
- Express

### Utilities

- js-yaml

---

# Project Structure

```
src/
│
├── components/
│   ├── AppShell.tsx
│   ├── SearchInput.tsx
│   └── TenantTabsHeader.tsx
│
├── context/
│   └── TenantDataContext.tsx
│
├── pages/
│   ├── TenantsPage.tsx
│   ├── ApisPage.tsx
│   ├── ApiDetailPage.tsx
│   ├── EventsPage.tsx
│   ├── FileTemplatesPage.tsx
│   └── FileTemplateDetailPage.tsx
│
├── services/
│   ├── specConverter.ts
│   └── fileTemplateCodes.ts
│
├── shared/
│   └── simpleApiFormat.ts
│
├── server/
│   ├── index.ts
│   └── services/
│       ├── dataStore.ts
│       ├── baseRegistrationService.ts
│       ├── apiService.ts
│       ├── eventService.ts
│       ├── fileTemplateService.ts
│       └── tenantService.ts
│
├── types/
│
├── App.tsx
├── main.tsx
└── index.css
```

---

# Application Flow

```
Application Start
        │
        ▼
Load Tenant List
        │
        ▼
TenantDataContext
        │
        ▼
   Tenants Page
        │
        ▼
 Tenant tab bar (APIs / Events / File Templates)
        │
        ├───────────────┬────────────────┐
        ▼               ▼                ▼
    APIs Page      Events Page   File Templates Page
        │
        ▼
   API Details
        │
        ▼
Swagger Viewer + Download Spec
```

---

# Navigation

## Tenants

Displays all configured tenants.

Each tenant contains:

- Tenant Information
- APIs
- Events
- File Templates

Selecting a tenant opens its APIs tab (see Tenant Details below).

---

## Tenant Details

Selecting a tenant opens a tabbed dashboard — **APIs / Events / File
Templates** — with a centered, pill-styled tab bar (`TenantTabsHeader`) at
the top of each tab for switching between them. This replaced the earlier
tile/pane grid layout on the tenant detail page. Visiting a tenant
(`/tenants/:tenantId`) redirects straight to its **APIs** tab.

- **APIs** — full API list for the tenant
- **Events** — full event catalog for the tenant
- **File Templates** — full template list for the tenant

---

## APIs

Shows every API available within the selected tenant.

Information includes:

- API Name
- Version
- Description
- Base URL
- Tags
- Endpoints

---

## API Details

Displays:

- Complete OpenAPI Specification
- Swagger UI
- Request/Response models
- Parameters
- Authentication
- Download options

Supported downloads:

- JSON
- YAML

---

## Events

Provides documentation for tenant events including:

- Event Name
- Description
- Payload
- Schema
- Publisher
- Consumer

---

## File Templates

Each file template can be either:

- **Legacy generic format** — `format` (CSV/XML/JSON/etc.), a flat `fields`
  list, and optional `sampleContent`
- **Rich SAP/ABAP-style format** — a header (`apiType`, `apiName`,
  `application`, `version`) plus `sections` and `mappings` — see
  **File Template registration format** under Backend API Reference below

Clicking a file template opens its detail page (`FileTemplateDetailPage.tsx`),
which adapts to whichever format that template uses:

- **Rich format** — sections render as a **hierarchy**, not a flat list: a
  child section (via `parentSection`) is nested and visually indented
  underneath its parent, connected by a solid vertical line with a short
  horizontal "elbow" linking it to its section card — the same visual
  language as a file-explorer tree — recursively to any depth, so a
  Header → Plants → Batches structure actually looks like one instead of
  three same-level cards. Each section's own API Name is shown right in
  its header row (not hidden inside the collapsed content), and each
  section is collapsible, showing a table of its own field mappings
  (position, field name, description, API name, mask, reference, default
  value, mapping type, download format, conversions, and checkbox columns
  for Parent Value/Required). Only top-level sections are expanded by
  default — nested child sections start collapsed, so opening a template
  with a deep hierarchy doesn't dump every level's mapping table onto the
  page at once. Coded values are decoded into readable badges rather than
  shown raw — e.g. `apiType: "P"` → **Post**,
  `mappingType: "I"` → **Import**, `conversions: "X"` → **Skip
  Conversions**. A search box filters fields by name/description across
  every section at once, and mappings that reference an unrecognized
  section name are shown separately under "Ungrouped fields" rather than
  silently dropped.
- **Legacy format** — a plain field table (name/type/required/description)
  plus the sample content block, same as before.

This page also has its **own breadcrumb** (`Tenants › {tenant} › File
Templates › {template name}`) plus a dedicated "← Back to File Templates"
link, rather than reusing the tab bar — since drilling into one template is
a distinct step down, not just another tab to switch to.

---

# Data Flow

```
JSON Configuration
        │
        ▼
File Parser
        │
        ▼
TenantDataContext
        │
        ▼
React Components
        │
        ▼
Pages
        │
        ▼
Swagger Viewer / Downloads
```

---

# Backend API Reference

The Express backend (`src/server/index.ts`) stores data as one JSON file per
item on disk, split by tenant and category. Each category — APIs, Events,
and File Templates — is backed by its own dedicated registration service in
`src/server/services/` (`apiService.ts`, `eventService.ts`,
`fileTemplateService.ts`), all built on a shared `RegistrationService` base
class (`baseRegistrationService.ts`) so they behave consistently while
writing to their own folder:

```
<DATA_DIR>/Tenants/tenants.json               tenant metadata list
<DATA_DIR>/<tenant_id>/API/<id>.json           apiService
<DATA_DIR>/<tenant_id>/Events/<id>.json        eventService
<DATA_DIR>/<tenant_id>/File_Templates/<id>.json  fileTemplateService
```

`DATA_DIR` defaults to `./data` and can be overridden with an environment
variable (see the Cloud Foundry section below).

> **Note:** registration is done entirely through these backend endpoints
> (curl, Postman, CI scripts, etc.) — there is no "Upload" button in the
> UI. The frontend is read-only: it lists and browses tenants, APIs,
> Events, and File Templates that were registered via the endpoints below.

## Tenants

| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/api/tenants` | List all tenants |
| GET | `/api/tenants/:tenantId` | Get a single tenant's metadata |
| GET | `/api/tenants/:tenantId/summary` | Get API / Event / File Template counts for a tenant |
| POST | `/api/tenants/upload` | Register a new tenant (JSON body) |
| DELETE | `/api/tenants/:tenantId` | Delete a tenant and its entire data folder |

### Registering a tenant

`POST /api/tenants/upload` takes the tenant's JSON directly as the request
body (`Content-Type: application/json`) — not a file attachment. The JSON
must be a single object with at least a `"name"` field; `"id"` and
`"description"` are optional (`"id"` is auto-generated by slugifying the
name if omitted):

```bash
curl -X POST http://localhost:3000/api/tenants/upload \
  -H "Content-Type: application/json" \
  -d '{ "name": "Retail Ops", "description": "Retail operations tenant" }'
```

On success, `tenantService`:

1. Validates the payload (400 on missing/invalid fields)
2. Rejects a duplicate `id` (409 if a tenant with that id already exists)
3. Appends the new tenant to `Tenants/tenants.json`
4. **Creates the tenant's `API/`, `Events/`, and `File_Templates/` folders
   up front (empty)** — so it's immediately ready to receive uploads via
   the `apis`/`events`/`file-templates` upload routes below, with no
   separate "initialize folders" step needed
5. Responds with `{ "status": "success", "message": "Tenant '<id>' registered
   successfully." }` — it doesn't echo back the tenant or tenant list; fetch
   `GET /api/tenants` or `GET /api/tenants/:tenantId` if you need those

### Deleting a tenant

```bash
curl -X DELETE http://localhost:3000/api/tenants/ETM
```

This is **destructive and irreversible**: `tenantService.remove` removes
the tenant's entry from `Tenants/tenants.json` and recursively deletes its
entire data folder — `API/`, `Events/`, `File_Templates/`, and anything
else under `<DATA_DIR>/<tenant_id>/`. Returns `{ "status": "error", "message": "..." }`
with a 404 if the tenant id doesn't exist, otherwise
`{ "status": "success", "message": "Tenant '<id>' deleted successfully." }`.

## APIs, Events & File Templates

The same four routes exist per category — only the path segment changes,
and each one is routed to its matching service:

| Method | Endpoint | Service | Writes to |
|--------|----------|---------|-----------|
| GET | `/api/tenants/:tenantId/apis` | `apiService` | — |
| GET | `/api/tenants/:tenantId/apis/:itemId` | `apiService` | — |
| POST | `/api/tenants/:tenantId/apis/upload` | `apiService` | `<tenant_id>/API/<id>.json` |
| DELETE | `/api/tenants/:tenantId/apis/:itemId` | `apiService` | — |
| GET | `/api/tenants/:tenantId/events` | `eventService` | — |
| GET | `/api/tenants/:tenantId/events/:itemId` | `eventService` | — |
| POST | `/api/tenants/:tenantId/events/upload` | `eventService` | `<tenant_id>/Events/<id>.json` |
| DELETE | `/api/tenants/:tenantId/events/:itemId` | `eventService` | — |
| GET | `/api/tenants/:tenantId/file-templates` | `fileTemplateService` | — |
| GET | `/api/tenants/:tenantId/file-templates/:itemId` | `fileTemplateService` | — |
| POST | `/api/tenants/:tenantId/file-templates/upload` | `fileTemplateService` | `<tenant_id>/File_Templates/<id>.json` |
| DELETE | `/api/tenants/:tenantId/file-templates/:itemId` | `fileTemplateService` | — |

### Registering an item

Each `upload` route takes the item's JSON directly as the request body
(`Content-Type: application/json`) — not a file attachment. Example —
registering an API for tenant `MX`:

```bash
curl -X POST http://localhost:3000/api/tenants/MX/apis/upload \
  -H "Content-Type: application/json" \
  -d '{ "name": "Order API", "baseUrl": "https://api.example.com/orders", "endpoints": [] }'
```

Swap `apis` for `events` or `file-templates` (and point to the matching
tenant) to register an Event or File Template instead.

The JSON body must be a single object with at least a `"name"` field.
If it doesn't include an `"id"`, one is auto-generated by slugifying the
name. On success, the corresponding service:

1. Confirms the tenant exists (404 if not)
2. Validates the payload (400 on missing/invalid fields — APIs additionally
   require `baseUrl`)
3. Creates the tenant's category folder (`API` / `Events` / `File_Templates`)
   if it doesn't already exist
4. Writes the item to `<id>.json` inside that folder
5. Responds with `{ "status": "success", "message": "API '<id>' registered
   successfully." }` (label matches the category — `Event`, `File Template`)
   — it doesn't echo back the item or list; fetch
   `GET /api/tenants/:tenantId/apis` (or `events`/`file-templates`) if you
   need the stored copy or the full list

All error responses across every route — validation failures, unknown
tenant/item, malformed JSON body, duplicate ids — use the same shape:
`{ "status": "error", "message": "..." }`, with an appropriate HTTP status
code (400/404/409/500).

### API registration format — simplified for ABAP

Registering an API (`POST /api/tenants/:tenantId/apis/upload`) does **not**
require raw OpenAPI JSON. `apiService` accepts a flatter, generic format
that's easy to produce from an ABAP backend, and **stores it exactly as
submitted** — no expansion happens at registration time. You never have to
construct OpenAPI's nested `parameters[].in`,
`content: { "application/json": {...} }`, or JSON-Schema `properties` maps
by hand; that's handled entirely in the browser when the API is viewed.

The expansion into an OpenAPI-ready shape (`src/shared/simpleApiFormat.ts`,
function `expandSimpleApi()`) and the further conversion into a full OpenAPI
3.0 document (`src/services/specConverter.ts`, function `convertToOpenAPI()`)
both run at **render time** in `ApiDetailPage.tsx`, right before the spec is
handed to Swagger UI or exported as JSON/YAML. Since `simpleApiFormat.ts`
lives in `src/shared/` rather than under `src/server/`, it's plain,
dependency-free TypeScript importable from both the backend (were it ever
needed there again) and the frontend.

```json
{
  "name": "Material Master API",
  "description": "Read and create materials",
  "baseUrl": "https://s4hana.example.com/sap/opu/odata/sap/MATERIAL_SRV",
  "version": "1.0.0",
  "endpoints": [
    {
      "path": "/materials/{materialNumber}",
      "method": "GET",
      "summary": "Get a material by number",
      "parameters": [
        { "name": "materialNumber", "type": "string", "required": true, "description": "Material number" },
        { "name": "plant", "type": "string", "description": "Plant code" }
      ],
      "responses": [
        {
          "status": 200,
          "description": "Material found",
          "fields": [
            { "name": "materialNumber", "type": "string" },
            { "name": "description", "type": "string" },
            { "name": "baseUnit", "type": "string" }
          ]
        },
        { "status": 404, "description": "Material not found" }
      ]
    },
    {
      "path": "/materials",
      "method": "POST",
      "summary": "Create a material",
      "requestBodyDescription": "Material to create",
      "requestFields": [
        { "name": "materialNumber", "type": "string", "required": true, "example": "MAT-1000" },
        { "name": "description", "type": "string", "required": true },
        { "name": "baseUnit", "type": "string" }
      ],
      "responses": [
        { "status": 201, "description": "Created", "fields": [ { "name": "materialNumber", "type": "string" } ] },
        { "status": 400, "description": "Validation error" }
      ]
    }
  ]
}
```

Per endpoint:

| Field | Required | Notes |
|-------|----------|-------|
| `path` | yes | e.g. `/materials/{materialNumber}` — use `{name}` for path segments |
| `method` | yes | `GET` / `POST` / `PUT` / `PATCH` / `DELETE` (case-insensitive) |
| `summary` | no | shown in Swagger UI; defaults to `"<METHOD> <path>"` if omitted |
| `description` | no | longer explanation, shown in Swagger UI |
| `parameters` | no | flat list: `{ name, type?, format?, example?, required?, description? }` |
| `requestFields` | no | flat list, same shape as `parameters` — becomes the JSON body schema for `POST`/`PUT`/`PATCH` |
| `requestBodyDescription` | no | description for the request body itself, separate from any individual field's description |
| `responses` | no | flat array, one entry per status code: `{ status?, description?, fields? }` — see below |

Each entry in `responses`:

| Field | Required | Notes |
|-------|----------|-------|
| `status` | no | HTTP status code, e.g. `200`, `201`, `400`, `404`. Defaults to `200` |
| `description` | no | defaults to `"Successful response"` for 2xx, `"Error response"` otherwise |
| `fields` | no | flat list, same shape as `parameters` — becomes that status's response body schema |

If `responses` is omitted entirely, a single bare `200` is generated
automatically.

### Nested objects and arrays (structures & tables)

Every field — in `parameters`, `requestFields`, or a response's `fields` —
can itself be a nested object or an array, not just a scalar. This maps
directly onto ABAP's own nested structures and internal tables, so a
material with a nested plant structure, a table of unit codes, and a table
of batch structures looks like this:

```json
{
  "name": "materialNumber",
  "type": "string"
},
{
  "name": "createdOn",
  "type": "string",
  "format": "date"
},
{
  "name": "plant",
  "type": "object",
  "fields": [
    { "name": "plantId", "type": "string" },
    { "name": "name", "type": "string" }
  ]
},
{
  "name": "unitsOfMeasure",
  "type": "array",
  "itemType": "string"
},
{
  "name": "batches",
  "type": "array",
  "items": [
    { "name": "batchNumber", "type": "string", "required": true },
    { "name": "quantity", "type": "number" },
    { "name": "storageLocation", "type": "object", "fields": [
      { "name": "code", "type": "string" },
      { "name": "description", "type": "string" }
    ]}
  ]
}
```

Field reference:

| `type` | Notes |
|--------|-------|
| `string` / `integer` / `number` / `boolean` | plain scalar (default is `string`) |
| `object` | nested structure — describe its own properties in `fields` (same field shape, recursive) |
| `array` of scalars | an internal table of a single value — set `itemType` (defaults to `string`) |
| `array` of objects | an internal table of a structure — set `items` to a field list (same shape as `fields`) |

`format` (optional, any scalar field) — a format hint carried straight
through onto the field's schema, e.g. `"date"`, `"date-time"`, `"email"`,
or a custom string like `"YYYY-MM-DD"` if that's what your source system
already uses for date fields.

`example` (optional, any field — scalar, object, or array) — an example
value carried straight through onto the field's schema and shown in
Swagger UI, e.g. `"example": "MAT-1000"` on a scalar, or
`"example": ["EA", "KG"]` on an array field.

This nests to any depth — an object can contain an array of objects that
themselves contain nested objects, and so on. If you need to drop in a raw
JSON-Schema fragment directly instead of building it from `fields`/`items`,
set `schema` on that field and it's used as-is.

Notes:

- **Parameter location is automatic.** You don't specify `in: "query"` or
  `in: "path"` — it's inferred from whether `{name}` appears in `path`.
- **`type`** is any JSON-Schema type string (`string`, `integer`, `number`,
  `boolean`, `array`, `object`); omit it and it defaults to `string`.
- **Backward compatible.** If an endpoint already includes full OpenAPI
  shapes (`parameters[].in`/`.schema`, `requestBody`, a `responses` object
  keyed by status code), those pass through unchanged — the simplified
  fields above are just a shorthand, not the only accepted format.

### File Template registration format

Registering a file template (`POST /api/tenants/:tenantId/file-templates/upload`)
accepts a header plus two flat lists — `sections` and `mappings` — joined by
section name, rather than mappings nested inside their section. Two flat
tables joined by a name, instead of one deeply-nested structure, is what
maps most directly onto ABAP's own internal tables.

```json
{
  "id": "material-master-upload",
  "name": "Material Master Upload",
  "description": "File template for bulk material master creation and updates",
  "apiType": "P",
  "apiName": "/materials/upload",
  "application": "MM",
  "version": "1.0.0",

  "sections": [
    { "name": "Header", "description": "Material header data", "apiName": "/materials/{materialNumber}", "parentSection": "" },
    { "name": "Plants", "description": "Plant-specific material data", "apiName": "/materials/{materialNumber}/plants", "parentSection": "Header" },
    { "name": "Batches", "description": "Batch records for each plant", "apiName": "/materials/{materialNumber}/plants/{plantCode}/batches", "parentSection": "Plants" }
  ],

  "mappings": [
    {
      "sectionName": "Header",
      "fieldName": "MaterialNumber",
      "description": "Material number",
      "apiName": "/materials/{materialNumber}",
      "fieldMask": "MATNR",
      "fieldPosition": 1,
      "refSection": "",
      "refField": "",
      "defaultValue": "",
      "parentValue": false,
      "mappingType": "I",
      "mandatory": true,
      "valueForDownload": "Value",
      "conversions": " "
    },
    {
      "sectionName": "Plants",
      "fieldName": "PlantCode",
      "description": "Plant code",
      "apiName": "/materials/{materialNumber}/plants",
      "fieldMask": "WERKS",
      "fieldPosition": 1,
      "refSection": "Header",
      "refField": "MaterialNumber",
      "defaultValue": "",
      "parentValue": true,
      "mappingType": "I",
      "mandatory": true,
      "valueForDownload": "Value",
      "conversions": " "
    },
    {
      "sectionName": "Batches",
      "fieldName": "BatchNumber",
      "description": "Batch number",
      "apiName": "/materials/{materialNumber}/plants/{plantCode}/batches",
      "fieldMask": "CHARG",
      "fieldPosition": 1,
      "refSection": "Plants",
      "refField": "PlantCode",
      "defaultValue": "",
      "parentValue": true,
      "mappingType": "I",
      "mandatory": true,
      "valueForDownload": "Value",
      "conversions": " "
    }
  ]
}
```

`Header → Plants → Batches` above is a **3-level hierarchy**: `Plants`'s
`parentSection` is `"Header"`, and `Batches`'s `parentSection` is
`"Plants"`. The detail page renders this as an actual nested tree (indented,
connected by a left border), not three same-level cards with a badge.

Header fields:

| Field | Required | Notes |
|-------|----------|-------|
| `name` | yes | |
| `id` | no | auto-slugified from `name` if omitted |
| `description` | no | |
| `apiType` | no | `" "` (space) = Get & Post, `"A"` = Process, `"X"` = Patch, `"P"` = Post |
| `apiName` | no | header-level default API name |
| `application` | no | e.g. `"MM"`, `"SD"` |
| `version` | no | |

Each entry in `sections`:

| Field | Required | Notes |
|-------|----------|-------|
| `name` | yes | referenced by `mappings[].sectionName` |
| `description` | no | |
| `apiName` | no | this section's own API name, if different from the header's |
| `parentSection` | no | name of the parent section, for nested sections; blank/omitted = top-level |

Each entry in `mappings`:

| Field | Required | Notes |
|-------|----------|-------|
| `sectionName` | yes | must match a `sections[].name` |
| `fieldName` | yes | |
| `description` | no | |
| `apiName` | no | |
| `fieldMask` | no | e.g. the underlying SAP field technical name |
| `fieldPosition` | no | number, used to order columns in the UI |
| `refSection` / `refField` | no | cross-reference to another section's field |
| `defaultValue` | no | |
| `parentValue` | no | checkbox — value is inherited from the parent record |
| `mappingType` | no | `"I"` = Import, `"E"` = Export, `" "` (space) = Both |
| `mandatory` | no | checkbox |
| `valueForDownload` | no | `"Value"` \| `"Description"` \| `"Both"` |
| `conversions` | no | `" "` (space) = All Checks, `"V"` = Skip Value Checks, `"X"` = Skip Conversions, `"Y"` = Skip Both |

The file template detail page decodes `apiType`, `mappingType`, and
`conversions` into readable badges automatically (see File Templates under
Navigation, above), and shows every mapping's `apiName` as its own table
column. A mapping whose `sectionName` doesn't match any defined section is
still shown — grouped separately under "Ungrouped fields" — rather than
dropped, so a typo in `sectionName` is visible instead of silently losing
data.

The older generic shape (`format`, a flat `fields` list, `sampleContent`)
still works unchanged and renders as a simple field table instead.

---

# Running Locally

Install dependencies

```bash
npm install
```

Start development

```bash
npm run dev
```

Application

```
http://localhost:5173
```

Backend

```
http://localhost:4000
```

---

# Production Build

```bash
npm run build
```

Run

```bash
npm start
```

---

# Cloud Foundry Deployment

```bash
cf push
```

Deployment configuration is available in:

```
manifest.yml
```

`manifest.yml` sets `DATA_DIR` to a path under the app's local disk
(`/home/vcap/app/data`), so the same upload endpoints described above work
unchanged on Cloud Foundry. Note that this is local, ephemeral disk:

- Anything written after the last deploy is lost on **restart / restage /
  crash recovery**.
- If `instances` is ever set above `1`, each instance has its own separate
  disk, so an upload to one instance won't be visible on another.

This is fine for a single-instance internal tool that re-seeds from the
repo's `data/` folder on each deploy. For uploads that need to survive
restarts, either bind a persistent volume service and point `DATA_DIR` at
its mount path, or swap the file I/O in `src/server/services/dataStore.ts`
for an object-store client (e.g. S3-compatible) — the three registration
services don't need to change either way, since they only touch disk
through `dataStore.ts`'s helpers.

---

# Folder Responsibilities

| Folder | Purpose |
|----------|----------|
| components | Reusable UI components |
| pages | Application pages |
| context | Global tenant state management |
| hooks | Shared React hooks |
| services | Parsing and OpenAPI conversion |
| server | Express backend |
| server/services | Per-domain registration services (APIs, Events, File Templates, Tenants) |
| types | Shared TypeScript models |

---

# Future Enhancements

- Search across tenants
- API version comparison
- Authentication support
- API testing from browser
- Role-based access
- Dark mode
- OpenAPI validation
- Event schema visualization

---

# License

Internal Vistex Project.
