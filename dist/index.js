import express from 'express';
import path from 'path';
import { DATA_DIR, ServiceError } from './services/dataStore.js';
import { tenantService } from './services/tenantService.js';
import { apiService } from './services/apiService.js';
import { eventService } from './services/eventService.js';
import { fileTemplateService } from './services/fileTemplateService.js';
const app = express();
const PORT = process.env.PORT || 3000;
// Parse JSON request bodies (5mb is plenty for a spec/template JSON).
app.use(express.json({ limit: '5mb' }));
// Malformed JSON in a request body throws a SyntaxError from the parser
// above; without this handler Express would fall through to its default
// HTML error page instead of a clean JSON 400.
app.use((err, _req, res, next) => {
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
const CATEGORY_SERVICES = {
    apis: apiService,
    events: eventService,
    'file-templates': fileTemplateService,
};
const CATEGORIES = ['apis', 'events', 'file-templates'];
function handleServiceError(err, res, fallback) {
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
function requireJsonBody(req, res) {
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
    }
    catch (err) {
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
    }
    catch (err) {
        handleServiceError(err, res, 'Failed to load tenant.');
    }
});
// GET /api/tenants/:tenantId/summary -> counts of APIs / Events / File Templates
app.get('/api/tenants/:tenantId/summary', async (req, res) => {
    try {
        const summary = await tenantService.summary(req.params.tenantId);
        res.json(summary);
    }
    catch (err) {
        handleServiceError(err, res, 'Failed to load summary.');
    }
});
// POST /api/tenants/upload -> register a new tenant from a JSON body
// ({ id?, name, description? }). Also creates the tenant's API / Events /
// File_Templates folders up front so it's immediately ready for uploads.
app.post('/api/tenants/upload', async (req, res) => {
    try {
        const parsed = requireJsonBody(req, res);
        if (parsed === undefined)
            return;
        const tenant = await tenantService.register(parsed);
        const tenants = await tenantService.list();
        res.json({ ok: true, tenant, tenants });
    }
    catch (err) {
        handleServiceError(err, res, 'Failed to register tenant.');
    }
});
// DELETE /api/tenants/:tenantId -> remove a tenant and its entire data
// folder (API/, Events/, File_Templates/, everything). Irreversible.
app.delete('/api/tenants/:tenantId', async (req, res) => {
    try {
        await tenantService.remove(req.params.tenantId);
        res.json({ ok: true });
    }
    catch (err) {
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
        }
        catch (err) {
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
        }
        catch (err) {
            handleServiceError(err, res, 'Failed to load item.');
        }
    });
    app.delete(`/api/tenants/:tenantId/${category}/:itemId`, async (req, res) => {
        try {
            await service.remove(req.params.tenantId, req.params.itemId);
            res.json({ ok: true });
        }
        catch (err) {
            handleServiceError(err, res, 'Failed to delete item.');
        }
    });
}
app.post('/api/tenants/:tenantId/:category(apis|events|file-templates)/upload', async (req, res) => {
    try {
        const category = req.params.category;
        const { tenantId } = req.params;
        const service = CATEGORY_SERVICES[category];
        const parsed = requireJsonBody(req, res);
        if (parsed === undefined)
            return;
        // Registering creates the tenant's category folder (API / Events /
        // File_Templates) on first use and writes the item as its own JSON file.
        const item = await service.register(tenantId, parsed);
        const items = await service.list(tenantId);
        res.json({ ok: true, item, items });
    }
    catch (err) {
        handleServiceError(err, res, 'Upload failed.');
    }
});
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
