import path from 'path';
import { promises as fs } from 'fs';
// ---------------------------------------------------------------------------
// Low-level, category-agnostic disk helpers shared by the per-domain
// registration services (apiService, eventService, fileTemplateService).
//
// Data layout on disk:
//   <DATA_DIR>/Tenants/tenants.json               tenant metadata list
//   <DATA_DIR>/<tenant_id>/API/*.json              one file per API definition
//   <DATA_DIR>/<tenant_id>/Events/*.json           one file per Event definition
//   <DATA_DIR>/<tenant_id>/File_Templates/*.json   one file per File Template
// ---------------------------------------------------------------------------
const PROJECT_ROOT = process.cwd();
export const DATA_DIR = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(PROJECT_ROOT, 'data');
export const TENANTS_DIR = path.join(DATA_DIR, 'Tenants');
export const TENANTS_FILE = path.join(TENANTS_DIR, 'tenants.json');
export function tenantDir(tenantId) {
    return path.join(DATA_DIR, tenantId);
}
export function resolveCategoryDir(tenantId, folderName) {
    return path.join(tenantDir(tenantId), folderName);
}
export async function ensureDir(dir) {
    await fs.mkdir(dir, { recursive: true });
}
export async function readJsonSafe(filePath) {
    try {
        const raw = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(raw);
    }
    catch (err) {
        if (err.code === 'ENOENT')
            return null;
        throw err;
    }
}
export async function listJsonFiles(dir) {
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        return entries
            .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.json'))
            .map((e) => e.name);
    }
    catch (err) {
        if (err.code === 'ENOENT')
            return [];
        throw err;
    }
}
export function slugify(value) {
    return (value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'item');
}
export async function getTenants() {
    const data = await readJsonSafe(TENANTS_FILE);
    return data?.tenants ?? [];
}
export async function tenantExists(tenantId) {
    const tenants = await getTenants();
    return tenants.some((t) => t.id === tenantId);
}
/** Thrown by a service's register/getOne/remove methods for expected, user-facing errors. */
export class ServiceError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
        this.name = 'ServiceError';
    }
}
