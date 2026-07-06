import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTenantData } from "../context/TenantDataContext";

export default function TenantsPage() {
  const { tenants, loaded, error, refresh } = useTenantData();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
    );
  }, [tenants, query]);

  return (
    <div className="w-full px-6 md:px-10 lg:px-16 py-10">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-slate-900">Tenants</h1>
          <p className="text-slate-600 mt-1">Browse the APIs, Events, and File Templates each tenant exposes.</p>
        </div>
        <button onClick={() => refresh()} className="btn-secondary">
          Refresh
        </button>
      </div>

      {tenants.length > 0 && (
        <div className="relative mt-6 max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a tenant…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
          />
        </div>
      )}

      {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

      {!loaded ? (
        <p className="text-slate-500 mt-8">Loading tenants…</p>
      ) : tenants.length === 0 ? (
        <div className="empty-state">
          <p className="text-slate-600">
            No tenants found. Register one via{" "}
            <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">POST /api/tenants/upload</code>.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p className="text-slate-600">No tenants match "{query}".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5 mt-8">
          {filtered.map((tenant) => (
            <button
              key={tenant.id}
              onClick={() => navigate(`/tenants/${tenant.id}/apis`)}
              className="catalog-card catalog-card--interactive group relative"
            >
              <span className="absolute left-0 top-5 bottom-5 w-1 bg-[#1D4ED8] rounded-r" />
              <div className="pl-3 flex items-start justify-between gap-2">
                <h2 className="text-[#1D4ED8] font-display font-semibold text-lg leading-snug">{tenant.name}</h2>
                <svg
                  className="mt-1 flex-shrink-0 text-slate-300 group-hover:text-[#1D4ED8] transition-colors"
                  width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                >
                  <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="border-b border-slate-100 my-3" />
              <p className="text-sm text-slate-600 pl-3">{tenant.description}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}