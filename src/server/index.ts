import express from 'express';
import path from 'path';

import { DATA_DIR, ServiceError } from './services/dataStore.js';
import { tenantService } from './services/tenantService.js';
import { apiService } from './services/apiService.js';
import { eventService } from './services/eventService.js';
import { fileTemplateService } from './services/fileTemplateService.js';
import type { RegistrationService } from './services/baseRegistrationService.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON request bodies (5mb is plenty for a spec/template JSON).
app.use(express.json({ limit: '5mb' }));

// Malformed JSON in a request body throws a SyntaxError from the parser
// above; without this handler Express would fall through to its default
// HTML error page instead of a clean JSON 400.
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    res.status(400).json({ error: 'Request body is not valid JSON.' });
    return;
  }
  next(err);
});

// Base data/static paths off the process working directory rather than
// __dirname. __dirname's depth differs between dev (tsx running the .ts
// file straight out of src/server/) and prod (tsc flattens the compiled
// server files to dist/) — using cwd sidesteps that mismatch, since
// npm always launches these scripts from the project root.
const PROJECT_ROOT = process.cwd();

// ---------------------------------------------------------------------------
// Data layout
// ---------------------------------------------------------------------------
// Tenant data is split across separate JSON files on disk, one dedicated
// registration service per category (see src/server/services/):
//
//   <DATA_DIR>/Tenants/tenants.json               tenant metadata list
//   <DATA_DIR>/<tenant_id>/API/*.json             apiService          -> one file per API
//   <DATA_DIR>/<tenant_id>/Events/*.json          eventService        -> one file per Event
//   <DATA_DIR>/<tenant_id>/File_Templates/*.json  fileTemplateService -> one file per File Template
//
// Each service owns its own folder name and validation rules, but shares the
// same register/list/getOne/remove mechanics via RegistrationService.
//
// NOTE for Cloud Foundry: the local filesystem on a CF instance is EPHEMERAL —
// anything written here is lost on restart/restage/crash, and is NOT shared
// across multiple app instances. This is fine for a single-instance demo/
// internal tool, but for durable uploads in production you should either:
//   1) bind a persistent volume service (e.g. an NFS volume service) and point
//      DATA_DIR at the mounted path, or
//   2) swap the read/write helpers in services/dataStore.ts for an object
//      store client (e.g. an S3-compatible service) behind the same
//      function signatures.

type Category = 'apis' | 'events' | 'file-templates';

const CATEGORY_SERVICES: Record<Category, RegistrationService> = {
  apis: apiService,
  events: eventService,
  'file-templates': fileTemplateService,
};

const CATEGORIES: Category[] = ['apis', 'events', 'file-templates'];

function handleServiceError(err: any, res: express.Response, fallback: string) {
  if (err instanceof ServiceError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: err?.message ?? fallback });
}

// Upload routes now take the item's JSON directly as the request body
// (Content-Type: application/json) rather than a multipart file. This just
// confirms a body actually arrived and is an object before handing it to a
// service's register() method, which does the real field-level validation.
function requireJsonBody(req: express.Request, res: express.Response): any | undefined {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    res.status(400).json({ error: 'Request body must be a JSON object (set Content-Type: application/json).' });
    return undefined;
  }
  return req.body;
}

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------

// GET /api/tenants -> list of tenants (from Tenants/tenants.json)
app.get('/api/tenants', async (_req, res) => {
  try {
    const tenants = await tenantService.list();
    res.json({ tenants });
  } catch (err: any) {
    handleServiceError(err, res, 'Failed to load tenants.');
  }
});

// GET /api/tenants/:tenantId -> single tenant's metadata
app.get('/api/tenants/:tenantId', async (req, res) => {
  try {
    const tenant = await tenantService.getOne(req.params.tenantId);
    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found.' });
      return;
    }
    res.json(tenant);
  } catch (err: any) {
    handleServiceError(err, res, 'Failed to load tenant.');
  }
});

// GET /api/tenants/:tenantId/summary -> counts of APIs / Events / File Templates
app.get('/api/tenants/:tenantId/summary', async (req, res) => {
  try {
    const summary = await tenantService.summary(req.params.tenantId);
    res.json(summary);
  } catch (err: any) {
    handleServiceError(err, res, 'Failed to load summary.');
  }
});

// POST /api/tenants/upload -> register a new tenant from a JSON body
// ({ id?, name, description? }). Also creates the tenant's API / Events /
// File_Templates folders up front so it's immediately ready for uploads.
app.post('/api/tenants/upload', async (req, res) => {
  try {
    const parsed = requireJsonBody(req, res);
    if (parsed === undefined) return;

    const tenant = await tenantService.register(parsed);
    const tenants = await tenantService.list();
    res.json({ ok: true, tenant, tenants });
  } catch (err: any) {
    handleServiceError(err, res, 'Failed to register tenant.');
  }
});

// DELETE /api/tenants/:tenantId -> remove a tenant and its entire data
// folder (API/, Events/, File_Templates/, everything). Irreversible.
app.delete('/api/tenants/:tenantId', async (req, res) => {
  try {
    await tenantService.remove(req.params.tenantId);
    res.json({ ok: true });
  } catch (err: any) {
    handleServiceError(err, res, 'Failed to delete tenant.');
  }
});

// Generic list / get-one / delete for each of apis, events, file-templates.
// Each route simply delegates to that category's dedicated registration
// service — the folder + JSON file mechanics live in the service, not here.
for (const category of CATEGORIES) {
  const service = CATEGORY_SERVICES[category];

  app.get(`/api/tenants/:tenantId/${category}`, async (req, res) => {
    try {
      const items = await service.list(req.params.tenantId);
      res.json({ items });
    } catch (err: any) {
      handleServiceError(err, res, `Failed to load ${category}.`);
    }
  });

  app.get(`/api/tenants/:tenantId/${category}/:itemId`, async (req, res) => {
    try {
      const item = await service.getOne(req.params.tenantId, req.params.itemId);
      if (!item) {
        res.status(404).json({ error: 'Not found.' });
        return;
      }
      res.json(item);
    } catch (err: any) {
      handleServiceError(err, res, 'Failed to load item.');
    }
  });

  app.delete(`/api/tenants/:tenantId/${category}/:itemId`, async (req, res) => {
    try {
      await service.remove(req.params.tenantId, req.params.itemId);
      res.json({ ok: true });
    } catch (err: any) {
      handleServiceError(err, res, 'Failed to delete item.');
    }
  });
}

app.post(
  '/api/tenants/:tenantId/:category(apis|events|file-templates)/upload',
  async (req, res) => {
    try {
      const category = req.params.category as Category;
      const { tenantId } = req.params;
      const service = CATEGORY_SERVICES[category];

      const parsed = requireJsonBody(req, res);
      if (parsed === undefined) return;

      // Registering creates the tenant's category folder (API / Events /
      // File_Templates) on first use and writes the item as its own JSON file.
      const item = await service.register(tenantId, parsed);
      const items = await service.list(tenantId);
      res.json({ ok: true, item, items });
    } catch (err: any) {
      handleServiceError(err, res, 'Upload failed.');
    }
  }
);

// ---------------------------------------------------------------------------
// Static frontend (built by `vite build` into dist/public)
// ---------------------------------------------------------------------------
const staticPath = path.join(PROJECT_ROOT, 'dist', 'public');
app.use(express.static(staticPath));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📖 Open http://localhost:${PORT} in your browser`);
  console.log(`🗂️  Data directory: ${DATA_DIR}`);
});