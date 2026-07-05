import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTenantData } from "../context/TenantDataContext";
import { JsonUploader } from "../components/FileUploadArea";
import type { FileTemplateSpec } from "../types/tenant";

export default function FileTemplatesPage() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { getTenant } = useTenantData();
  const tenant = getTenant(tenantId!);

  const [templates, setTemplates] = useState<FileTemplateSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/file-templates`);
      if (!res.ok) throw new Error(`Failed to load file templates (HTTP ${res.status}).`);
      const data = await res.json();
      setTemplates(data.items ?? []);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? "Failed to load file templates.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="w-full px-6 md:px-10 lg:px-16 py-10">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <button onClick={() => navigate(`/tenants/${tenantId}`)} className="text-sm text-blue-600 mb-4">
            ← Back to {tenant?.name ?? tenantId}
          </button>
          <h1 className="text-2xl font-semibold text-slate-900">File Templates — {tenant?.name ?? tenantId}</h1>
          <p className="text-slate-600 mt-1">{templates.length} template{templates.length === 1 ? "" : "s"} available</p>
        </div>
        <JsonUploader
          uploadUrl={`/api/tenants/${tenantId}/file-templates/upload`}
          label="Upload Template JSON"
          onUploaded={load}
        />
      </div>

      {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

      {loading ? (
        <p className="text-slate-500 mt-8">Loading…</p>
      ) : templates.length === 0 ? (
        <div className="mt-16 text-center text-slate-500 bg-white border border-dashed border-slate-300 rounded-xl py-16">
          No file templates yet for this tenant. Upload a template JSON file to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mt-8">
          {templates.map((tpl) => (
            <div key={tpl.id} className="text-left bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-blue-700 font-semibold text-lg">{tpl.name}</h2>
                {tpl.version && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">v{tpl.version}</span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-2">{tpl.description}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {tpl.format && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-teal-100 text-teal-700">
                    {tpl.format}
                  </span>
                )}
                {tpl.fields && <span className="text-xs text-gray-400 ml-auto">{tpl.fields.length} fields</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
