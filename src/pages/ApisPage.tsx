import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TenantTabsHeader } from "../components/TenantTabsHeader";
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
      <TenantTabsHeader />

      {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

      {loading ? (
        <p className="text-slate-500 mt-8">Loading…</p>
      ) : apis.length === 0 ? (
        <div className="empty-state">
          <p className="text-slate-600">
            No APIs yet for this tenant.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mt-8">
          {apis.map((api) => {
            const methods = Array.from(new Set(api.endpoints.map((e) => e.method.toUpperCase())));
            return (
              <button
                key={api.id}
                onClick={() => navigate(`/tenants/${tenantId}/apis/${api.id}`)}
                className="catalog-card catalog-card--interactive relative"
              >
                <span className="absolute left-0 top-5 bottom-5 w-1 bg-[#1D4ED8] rounded-r" />
                <div className="pl-3 flex items-center justify-between gap-2">
                  <h2 className="font-display font-semibold text-lg text-[#1E40AF] leading-snug">{api.name}</h2>
                  {api.version && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded flex-shrink-0">v{api.version}</span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-2 pl-3">{api.description}</p>
                {api.baseUrl && <p className="text-xs text-slate-400 mt-2 pl-3 font-mono truncate">{api.baseUrl}</p>}
                <div className="flex flex-wrap gap-2 mt-3 pl-3 items-center">
                  {methods.map((m) => (
                    <span key={m} className={`text-xs font-medium px-2 py-0.5 rounded ${methodColor[m] ?? "bg-slate-100 text-slate-600"}`}>
                      {m}
                    </span>
                  ))}
                  <span className="text-xs text-slate-400 ml-auto">{api.endpoints.length} endpoints</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}