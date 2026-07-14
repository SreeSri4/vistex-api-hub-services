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

  return (
    <div className="w-full px-6 md:px-10 lg:px-16 py-10">
      <TenantTabsHeader />

      {templates.length > 0 && (
        <div className="flex justify-end mt-6">
          <SearchInput value={query} onChange={setQuery} placeholder="Find a File Template" />
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
    </div>
  );
}