import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TenantTabsHeader } from "../components/TenantTabsHeader";
import { SearchInput } from "../components/SearchInput";
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
  const [query, setQuery] = useState("");

  const [compareMode, setCompareMode] = useState(false);
  const [selectedApis, setSelectedApis] = useState<Set<string>>(new Set());

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return apis;
    return apis.filter(
      (api) =>
        api.name.toLowerCase().includes(q) ||
        api.description?.toLowerCase().includes(q) ||
        api.baseUrl?.toLowerCase().includes(q)
    );
  }, [apis, query]);

  // Group APIs by name for compare mode
  const apisByName = useMemo(() => {
    const map = new Map<string, ApiSpec[]>();
    for (const api of apis) {
      const key = api.name;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(api);
    }
    return map;
  }, [apis]);

  // Name of the first selected API (for same-name validation)
  const selectedApiName = useMemo(() => {
    if (selectedApis.size === 0) return null;
    const firstId = Array.from(selectedApis)[0];
    return apis.find((a) => a.id === firstId)?.name ?? null;
  }, [selectedApis, apis]);

  const toggleApiSelection = (apiId: string) => {
    setSelectedApis((prev) => {
      const next = new Set(prev);
      if (next.has(apiId)) {
        next.delete(apiId);
      } else if (next.size === 0) {
        next.add(apiId);
      } else if (next.size === 1) {
        // Validate same name
        const firstId = Array.from(next)[0];
        const firstName = apis.find((a) => a.id === firstId)?.name;
        const candidateName = apis.find((a) => a.id === apiId)?.name;
        if (firstName && candidateName && firstName !== candidateName) return prev;
        next.add(apiId);
      }
      return next;
    });
  };

  const handleCompareClick = () => {
    if (selectedApis.size !== 2) return;
    const [id1, id2] = Array.from(selectedApis);
    navigate(`/tenants/${tenantId}/apis/compare?api1=${id1}&api2=${id2}`);
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setSelectedApis(new Set());
  };

  // Group filtered APIs by name for the grid display
  const groupedApis = useMemo(() => {
    if (!compareMode) return null;
    const groups = new Map<string, ApiSpec[]>();
    for (const api of filtered) {
      const key = api.name;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(api);
    }
    return groups;
  }, [filtered, compareMode]);

  return (
    <div className="w-full px-6 md:px-10 lg:px-16 py-10">
      <TenantTabsHeader />

      {apis.length > 0 && (
        <div className="flex justify-end items-center gap-3 mt-6">
          {compareMode ? (
            <>
              <button
                onClick={handleCompareClick}
                disabled={selectedApis.size !== 2}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  selectedApis.size === 2
                    ? "bg-[#1D4ED8] text-white hover:bg-blue-800"
                    : "bg-slate-200 text-slate-500 cursor-not-allowed"
                }`}
              >
                Compare Selected ({selectedApis.size}/2)
              </button>
              <button
                onClick={exitCompareMode}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setCompareMode(true)}
              disabled={apis.length < 2}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                apis.length >= 2
                  ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  : "bg-slate-200 text-slate-500 cursor-not-allowed"
              }`}
            >
              Compare Versions
            </button>
          )}
          {!compareMode && <SearchInput value={query} onChange={setQuery} placeholder="Find an API" label="Search APIs" />}
        </div>
      )}

      {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

      {loading ? (
        <p className="text-slate-500 mt-8">Loading…</p>
      ) : apis.length === 0 ? (
        <div className="empty-state">
          <p className="text-slate-600">No APIs yet for this tenant.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p className="text-slate-600">No APIs match "{query}".</p>
        </div>
      ) : compareMode && groupedApis ? (
        <div className="mt-8 space-y-8">
          {selectedApiName && (
            <p className="text-sm text-slate-500">
              Comparing versions of <span className="font-semibold text-slate-700">{selectedApiName}</span> — only APIs with the same name can be compared.
            </p>
          )}
          {Array.from(groupedApis.entries()).map(([name, groupApis]) => {
            const isSelectable = !selectedApiName || name === selectedApiName;
            const count = apisByName.get(name)?.length ?? groupApis.length;
            return (
              <div key={name}>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className={`text-sm font-semibold ${isSelectable ? "text-slate-800" : "text-slate-400"}`}>{name}</h3>
                  <span className="text-xs text-slate-400">{count} version{count !== 1 ? "s" : ""}</span>
                  {!isSelectable && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Different API</span>
                  )}
                </div>
                <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 ${!isSelectable ? "opacity-40 pointer-events-none" : ""}`}>
                  {groupApis.map((api) => {
                    const methods = Array.from(new Set(api.endpoints.map((e) => e.method.toUpperCase())));
                    const isSelected = selectedApis.has(api.id);
                    return (
                      <button
                        key={api.id}
                        onClick={() => toggleApiSelection(api.id)}
                        className={`catalog-card catalog-card--interactive relative ${
                          isSelected ? "ring-2 ring-[#1D4ED8] ring-offset-2" : ""
                        }`}
                      >
                        <div className="absolute top-3 right-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                              isSelected ? "bg-[#1D4ED8] border-[#1D4ED8]" : "border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                <path d="M5 12l5 5L20 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <span className="absolute left-0 top-5 bottom-5 w-1 bg-[#1D4ED8] rounded-r" />
                        <div className="pl-3 flex items-center justify-between gap-2">
                          <h2 className="font-display font-semibold text-lg text-[#1E40AF] leading-snug">{api.name}</h2>
                          {api.version && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded flex-shrink-0">
                              v{api.version}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-2 pl-3">{api.description}</p>
                        {api.baseUrl && (
                          <p className="text-xs text-slate-400 mt-2 pl-3 font-mono truncate">{api.baseUrl}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-3 pl-3 items-center">
                          {methods.map((m) => (
                            <span
                              key={m}
                              className={`text-xs font-medium px-2 py-0.5 rounded ${methodColor[m] ?? "bg-slate-100 text-slate-600"}`}
                            >
                              {m}
                            </span>
                          ))}
                          <span className="text-xs text-slate-400 ml-auto">{api.endpoints.length} endpoints</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mt-8">
          {filtered.map((api) => {
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
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded flex-shrink-0">
                      v{api.version}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-2 pl-3">{api.description}</p>
                {api.baseUrl && (
                  <p className="text-xs text-slate-400 mt-2 pl-3 font-mono truncate">{api.baseUrl}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3 pl-3 items-center">
                  {methods.map((m) => (
                    <span
                      key={m}
                      className={`text-xs font-medium px-2 py-0.5 rounded ${methodColor[m] ?? "bg-slate-100 text-slate-600"}`}
                    >
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

      {compareMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0f2847] text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-4 z-50">
          <span className="text-sm">
            Select 2 APIs with the same name{" "}
            <span className="font-semibold">
              ({selectedApis.size}/2 selected)
            </span>
          </span>
          <button
            onClick={handleCompareClick}
            disabled={selectedApis.size !== 2}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
              selectedApis.size === 2
                ? "bg-[#49cc90] text-white hover:bg-[#3fb87f]"
                : "bg-slate-600 text-slate-400 cursor-not-allowed"
            }`}
          >
            Compare
          </button>
        </div>
      )}
    </div>
  );
}
