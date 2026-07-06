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

## Technology Stack

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

- JSZip
- js-yaml
- Multer

---

# Project Structure

```
src/
│
├── components/
│   ├── ApiNode.tsx
│   ├── DownloadPanel.tsx
│   ├── Header.tsx
│   ├── SpecViewer.tsx
│   └── TenantTree.tsx
│
├── context/
│   └── TenantDataContext.tsx
│
├── hooks/
│   └── useAppState.ts
│
├── pages/
│   ├── TenantsPage.tsx
│   ├── TenantDetailPage.tsx
│   ├── ApisPage.tsx
│   ├── ApiDetailPage.tsx
│   ├── EventsPage.tsx
│   └── FileTemplatesPage.tsx
│
├── services/
│   ├── fileParser.ts
│   └── specConverter.ts
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
Load Tenant Configuration
        │
        ▼
TenantDataContext
        │
        ▼
React Router
        │
        ├──────────────┐
        ▼              ▼
 Tenants Page      APIs Page
        │              │
        ▼              ▼
Tenant Details    API Details
        │              │
        ▼              ▼
Swagger Viewer  Download Spec
        │
        ├──────────────┐
        ▼              ▼
 Events Page   File Templates
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

Selecting a tenant opens its detailed dashboard.

---

## Tenant Details

Displays:

- Tenant metadata
- Available APIs
- Event list
- File Templates
- Summary information

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

Displays downloadable templates associated with a tenant.

Typical templates include:

- JSON
- CSV
- XML
- Excel

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
| POST | `/api/tenants/upload` | Register a new tenant |
| DELETE | `/api/tenants/:tenantId` | Delete a tenant and its entire data folder |

### Registering a tenant (upload)

`POST /api/tenants/upload` accepts a single JSON file as
`multipart/form-data` under the field name `file`, same as the category
upload routes below. The JSON must be a single object with at least a
`"name"` field; `"id"` and `"description"` are optional (`"id"` is
auto-generated by slugifying the name if omitted):

```bash
curl -F "file=@retail-ops.json;type=application/json" \
  http://localhost:3000/api/tenants/upload
```

```json
{ "name": "Retail Ops", "description": "Retail operations tenant" }
```

On success, `tenantService`:

1. Validates the payload (400 on missing/invalid fields)
2. Rejects a duplicate `id` (409 if a tenant with that id already exists)
3. Appends the new tenant to `Tenants/tenants.json`
4. **Creates the tenant's `API/`, `Events/`, and `File_Templates/` folders
   up front (empty)** — so it's immediately ready to receive uploads via
   the `apis`/`events`/`file-templates` upload routes below, with no
   separate "initialize folders" step needed
5. Responds with `{ ok: true, tenant, tenants }` — the newly registered
   tenant plus the full refreshed tenant list

### Deleting a tenant

```bash
curl -X DELETE http://localhost:3000/api/tenants/ETM
```

This is **destructive and irreversible**: `tenantService.remove` removes
the tenant's entry from `Tenants/tenants.json` and recursively deletes its
entire data folder — `API/`, `Events/`, `File_Templates/`, and anything
else under `<DATA_DIR>/<tenant_id>/`. Returns 404 if the tenant id doesn't
exist, otherwise `{ ok: true }`.

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

### Registering an item (upload)

Each `upload` route accepts a single JSON file as `multipart/form-data`
under the field name `file`. Example — registering an API for tenant `MX`:

```bash
curl -F "file=@my-api.json;type=application/json" \
  http://localhost:3000/api/tenants/MX/apis/upload
```

Swap `apis` for `events` or `file-templates` (and point to the matching
tenant) to register an Event or File Template instead.

The uploaded JSON must be a single object with at least a `"name"` field.
If it doesn't include an `"id"`, one is auto-generated by slugifying the
name. On success, the corresponding service:

1. Confirms the tenant exists (404 if not)
2. Validates the payload (400 on missing/invalid fields — APIs additionally
   require `baseUrl`)
3. Creates the tenant's category folder (`API` / `Events` / `File_Templates`)
   if it doesn't already exist
4. Writes the item to `<id>.json` inside that folder
5. Responds with `{ ok: true, item, items }` — the newly written item plus
   the full refreshed list for that tenant/category

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