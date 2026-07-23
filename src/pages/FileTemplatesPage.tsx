import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TenantTabsHeader } from "../components/TenantTabsHeader";
import { SearchInput } from "../components/SearchInput";
import { apiTypeBadge } from "../services/fileTemplateCodes";
import type { FileTemplateSpec } from "../types/tenant";

export default function FileTemplatesPage() {
  const { tenantId } = useParams();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<FileTemplateSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [compareMode, setCompareMode] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (tpl) =>
        tpl.name.toLowerCase().includes(q) ||
        tpl.description?.toLowerCase().includes(q) ||
        tpl.format?.toLowerCase().includes(q)
    );
  }, [templates, query]);

  // Group templates by name for compare mode
  const selectedTemplateName = useMemo(() => {
    if (selectedTemplates.size === 0) return null;
    const firstId = Array.from(selectedTemplates)[0];
    return templates.find((t) => t.id === firstId)?.name ?? null;
  }, [selectedTemplates, templates]);

  const toggleSelection = (tplId: string) => {
    setSelectedTemplates((prev) => {
      const next = new Set(prev);
      if (next.has(tplId)) {
        next.delete(tplId);
      } else if (next.size === 0) {
        next.add(tplId);
      } else if (next.size === 1) {
        const firstId = Array.from(next)[0];
        const firstName = templates.find((t) => t.id === firstId)?.name;
        const candidateName = templates.find((t) => t.id === tplId)?.name;
        if (firstName && candidateName && firstName !== candidateName) return prev;
        next.add(tplId);
      }
      return next;
    });
  };

  const handleCompareClick = () => {
    if (selectedTemplates.size !== 2) return;
    const [id1, id2] = Array.from(selectedTemplates);
    navigate(`/tenants/${tenantId}/file-templates/compare?tpl1=${id1}&tpl2=${id2}`);
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setSelectedTemplates(new Set());
  };

  // Group filtered templates by name for the grid display
  const groupedTemplates = useMemo(() => {
    if (!compareMode) return null;
    const groups = new Map<string, FileTemplateSpec[]>();
    for (const tpl of filtered) {
      const key = tpl.name;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(tpl);
    }
    return groups;
  }, [filtered, compareMode]);

  return (
    <div className="w-full px-6 md:px-10 lg:px-16 py-10">
      <TenantTabsHeader />

      {templates.length > 0 && (
        <div className="flex justify-end items-center gap-3 mt-6">
          {compareMode ? (
            <>
              <button
                onClick={handleCompareClick}
                disabled={selectedTemplates.size !== 2}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  selectedTemplates.size === 2
                    ? "bg-[#B45309] text-white hover:bg-[#92400E]"
                    : "bg-slate-200 text-slate-500 cursor-not-allowed"
                }`}
              >
                Compare Selected ({selectedTemplates.size}/2)
              </button>
              <button
                onClick={exitCompareMode}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setCompareMode(true)}
                disabled={templates.length < 2}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  templates.length >= 2
                    ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    : "bg-slate-200 text-slate-500 cursor-not-allowed"
                }`}
              >
                Compare Versions
              </button>
              <SearchInput value={query} onChange={setQuery} placeholder="Find a File Template" label="Search file templates" />
            </>
          )}
        </div>
      )}

      {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

      {loading ? (
        <p className="text-slate-500 mt-8">Loading…</p>
      ) : templates.length === 0 ? (
        <div className="empty-state">
          <p className="text-slate-600">
            No file templates yet for this tenant. Register one via{" "}
            <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
              POST /api/tenants/{tenantId}/file-templates/upload
            </code>
            .
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p className="text-slate-600">No file templates match "{query}".</p>
        </div>
      ) : compareMode && groupedTemplates ? (
        <div className="mt-8 space-y-8">
          {selectedTemplateName && (
            <p className="text-sm text-slate-500">
              Comparing versions of <span className="font-semibold text-slate-700">{selectedTemplateName}</span> — only templates with the same name can be compared.
            </p>
          )}
          {Array.from(groupedTemplates.entries()).map(([name, groupTemplates]) => {
            const isSelectable = !selectedTemplateName || name === selectedTemplateName;
            return (
              <div key={name}>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className={`text-sm font-semibold ${isSelectable ? "text-slate-800" : "text-slate-400"}`}>{name}</h3>
                  <span className="text-xs text-slate-400">{groupTemplates.length} version{groupTemplates.length !== 1 ? "s" : ""}</span>
                  {!isSelectable && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Different template</span>
                  )}
                </div>
                <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 ${!isSelectable ? "opacity-40 pointer-events-none" : ""}`}>
                  {groupTemplates.map((tpl) => {
                    const fieldCount = tpl.fields?.length ?? tpl.mappings?.length ?? 0;
                    const isSelected = selectedTemplates.has(tpl.id);
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => toggleSelection(tpl.id)}
                        className={`catalog-card catalog-card--interactive relative ${
                          isSelected ? "ring-2 ring-[#B45309] ring-offset-2" : ""
                        }`}
                      >
                        <div className="absolute top-3 right-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                              isSelected ? "bg-[#B45309] border-[#B45309]" : "border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                <path d="M5 12l5 5L20 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <span className="absolute left-0 top-5 bottom-5 w-1 bg-[#B45309] rounded-r" />
                        <div className="pl-3 flex items-center justify-between gap-2">
                          <h2 className="font-display font-semibold text-lg text-[#92400E] leading-snug">{tpl.name}</h2>
                          {tpl.version && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded flex-shrink-0">v{tpl.version}</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-2 pl-3">{tpl.description}</p>
                        <div className="flex flex-wrap gap-2 mt-3 pl-3 items-center">
                          {tpl.format && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#FEF3E2] text-[#92400E]">
                              {tpl.format}
                            </span>
                          )}
                          {!tpl.format && (tpl.sections?.length || tpl.mappings?.length) ? (
                            (() => {
                              const badge = apiTypeBadge(tpl.apiType);
                              return <span className={`text-xs font-medium px-2 py-0.5 rounded ${badge.className}`}>{badge.label}</span>;
                            })()
                          ) : null}
                          {tpl.sections && tpl.sections.length > 0 && (
                            <span className="text-xs text-slate-400">{tpl.sections.length} section{tpl.sections.length === 1 ? "" : "s"}</span>
                          )}
                          {fieldCount > 0 && <span className="text-xs text-slate-400 ml-auto">{fieldCount} field{fieldCount === 1 ? "" : "s"}</span>}
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
          {filtered.map((tpl) => {
            const fieldCount = tpl.fields?.length ?? tpl.mappings?.length ?? 0;
            return (
              <button
                key={tpl.id}
                onClick={() => navigate(`/tenants/${tenantId}/file-templates/${tpl.id}`)}
                className="catalog-card catalog-card--interactive relative"
              >
                <span className="absolute left-0 top-5 bottom-5 w-1 bg-[#B45309] rounded-r" />
                <div className="pl-3 flex items-center justify-between gap-2">
                  <h2 className="font-display font-semibold text-lg text-[#92400E] leading-snug">{tpl.name}</h2>
                  {tpl.version && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded flex-shrink-0">v{tpl.version}</span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-2 pl-3">{tpl.description}</p>
                <div className="flex flex-wrap gap-2 mt-3 pl-3 items-center">
                  {tpl.format && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#FEF3E2] text-[#92400E]">
                      {tpl.format}
                    </span>
                  )}
                  {!tpl.format && (tpl.sections?.length || tpl.mappings?.length) ? (
                    (() => {
                      const badge = apiTypeBadge(tpl.apiType);
                      return <span className={`text-xs font-medium px-2 py-0.5 rounded ${badge.className}`}>{badge.label}</span>;
                    })()
                  ) : null}
                  {tpl.sections && tpl.sections.length > 0 && (
                    <span className="text-xs text-slate-400">{tpl.sections.length} section{tpl.sections.length === 1 ? "" : "s"}</span>
                  )}
                  {fieldCount > 0 && <span className="text-xs text-slate-400 ml-auto">{fieldCount} field{fieldCount === 1 ? "" : "s"}</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {compareMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0f2847] text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-4 z-50">
          <span className="text-sm">
            Select 2 File Templates with the same name{" "}
            <span className="font-semibold">
              ({selectedTemplates.size}/2 selected)
            </span>
          </span>
          <button
            onClick={handleCompareClick}
            disabled={selectedTemplates.size !== 2}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
              selectedTemplates.size === 2
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
