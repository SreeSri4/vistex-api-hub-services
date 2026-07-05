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
- JSON configuration upload
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
│   ├── FileUploadArea.tsx
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
│   └── index.ts
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