import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTenantData } from "../context/TenantDataContext";
import { SearchInput } from "../components/SearchInput";

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
        <div className="flex flex-col items-end gap-3">
          <button onClick={() => refresh()} className="btn-secondary">
            Refresh
          </button>
          {tenants.length > 0 && (
            <SearchInput value={query} onChange={setQuery} placeholder="Find a Tenant" />
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