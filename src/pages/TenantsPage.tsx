import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTenantData } from "../context/TenantDataContext";
import { SearchInput } from "../components/SearchInput";

interface TenantWithSummary {
  id: string;
  name: string;
  description?: string;
  apiCount?: number;
  eventCount?: number;
  fileTemplateCount?: number;
}

export default function TenantsPage() {
  const { tenants, loaded, error, refresh } = useTenantData();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [summaries, setSummaries] = useState<Record<string, { apiCount: number; eventCount: number; fileTemplateCount: number }>>({});

  useEffect(() => {
    if (tenants.length === 0) return;
    Promise.all(
      tenants.map((t) =>
        fetch(`/api/tenants/${t.id}/summary`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => (data ? [t.id, data] : null))
          .catch(() => null)
      )
    ).then((results) => {
      const map: Record<string, { apiCount: number; eventCount: number; fileTemplateCount: number }> = {};
      for (const r of results) {
        if (r) map[r[0]] = r[1];
      }
      setSummaries(map);
    });
  }, [tenants]);

  const enrichedTenants: TenantWithSummary[] = useMemo(
    () => tenants.map((t) => ({ ...t, ...summaries[t.id] })),
    [tenants, summaries]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return enrichedTenants;
    return enrichedTenants.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
    );
  }, [enrichedTenants, query]);

  return (
    <div className="w-full px-6 md:px-10 lg:px-16 py-10">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-slate-900">Tenants</h1>
          <p className="text-slate-600 mt-1">Browse the APIs, Events, and File Templates each tenant exposes.</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <button onClick={() => refresh()} className="btn-secondary">
            Refresh
          </button>
          {tenants.length > 0 && (
            <SearchInput value={query} onChange={setQuery} placeholder="Find a Tenant" label="Search tenants" />
          )}
        </div>
      </div>

      {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

      {!loaded ? (
        <p className="text-slate-500 mt-8">Loading tenants…</p>
      ) : tenants.length === 0 ? (
        <div className="empty-state">
          <p className="text-slate-600">
            No Tenants found.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p className="text-slate-600">No tenants match "{query}".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {filtered.map((tenant) => {
            const totalItems = (tenant.apiCount ?? 0) + (tenant.eventCount ?? 0) + (tenant.fileTemplateCount ?? 0);
            return (
              <button
                key={tenant.id}
                onClick={() => navigate(`/tenants/${tenant.id}/apis`)}
                className="catalog-card catalog-card--interactive group relative text-left p-6"
              >
                <span className="absolute left-0 top-5 bottom-5 w-1 bg-[#1D4ED8] rounded-r" />
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-[#1D4ED8] font-display font-semibold text-xl leading-snug">{tenant.name}</h2>
                  <svg
                    className="mt-1 flex-shrink-0 text-slate-300 group-hover:text-[#1D4ED8] transition-colors"
                    width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                  >
                    <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                {tenant.description && (
                  <p className="text-sm text-slate-500 mt-2 line-clamp-2">{tenant.description}</p>
                )}
                {totalItems > 0 && (
                  <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-100">
                    {tenant.apiCount !== undefined && tenant.apiCount > 0 && (
                      <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                        {tenant.apiCount} API{tenant.apiCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    {tenant.eventCount !== undefined && tenant.eventCount > 0 && (
                      <span className="text-xs font-medium text-violet-700 bg-violet-50 px-2.5 py-1 rounded-full">
                        {tenant.eventCount} Event{tenant.eventCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    {tenant.fileTemplateCount !== undefined && tenant.fileTemplateCount > 0 && (
                      <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                        {tenant.fileTemplateCount} Template{tenant.fileTemplateCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}