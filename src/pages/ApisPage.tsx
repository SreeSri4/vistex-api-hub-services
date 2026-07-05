import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTenantData } from "../context/TenantDataContext";
import { JsonUploader } from "../components/FileUploadArea";
import type { ApiSpec } from "../types/tenant";

const methodColor: Record<string, string> = {
  GET: "bg-green-100 text-green-700",
  POST: "bg-blue-100 text-blue-700",
  PUT: "bg-amber-100 text-amber-700",
  PATCH: "bg-amber-100 text-amber-700",
  DELETE: "bg-red-100 text-red-700",
};

export default function ApisPage() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { getTenant } = useTenantData();
  const tenant = getTenant(tenantId!);

  const [apis, setApis] = useState<ApiSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/apis`);
      if (!res.ok) throw new Error(`Failed to load APIs (HTTP ${res.status}).`);
      const data = await res.json();
      setApis(data.items ?? []);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? "Failed to load APIs.");
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
          <h1 className="text-2xl font-semibold text-slate-900">APIs — {tenant?.name ?? tenantId}</h1>
          <p className="text-slate-600 mt-1">{apis.length} API{apis.length === 1 ? "" : "s"} available</p>
        </div>
        <JsonUploader
          uploadUrl={`/api/tenants/${tenantId}/apis/upload`}
          label="Upload API JSON"
          onUploaded={load}
        />
      </div>

      {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

      {loading ? (
        <p className="text-slate-500 mt-8">Loading…</p>
      ) : apis.length === 0 ? (
        <div className="mt-16 text-center text-slate-500 bg-white border border-dashed border-slate-300 rounded-xl py-16">
          No APIs yet for this tenant. Upload an API JSON file to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mt-8">
          {apis.map((api) => {
            const methods = Array.from(new Set(api.endpoints.map((e) => e.method.toUpperCase())));
            return (
              <button
                key={api.id}
                onClick={() => navigate(`/tenants/${tenantId}/apis/${api.id}`)}
                className="text-left bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-blue-700 font-semibold text-lg">{api.name}</h2>
                  {api.version && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">v{api.version}</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2">{api.description}</p>
                {api.baseUrl && <p className="text-xs text-gray-400 mt-2 font-mono">{api.baseUrl}</p>}
                <div className="flex flex-wrap gap-2 mt-3">
                  {methods.map((m) => (
                    <span key={m} className={`text-xs font-medium px-2 py-0.5 rounded ${methodColor[m] ?? "bg-gray-100 text-gray-600"}`}>
                      {m}
                    </span>
                  ))}
                  <span className="text-xs text-gray-400 ml-auto">{api.endpoints.length} endpoints</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
