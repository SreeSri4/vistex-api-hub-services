import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { TenantTabsHeader } from "../components/TenantTabsHeader";
import type { FileTemplateSpec } from "../types/tenant";

export default function FileTemplatesPage() {
  const { tenantId } = useParams();

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
      <TenantTabsHeader />

      {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

      {loading ? (
        <p className="text-slate-500 mt-8">Loading…</p>
      ) : templates.length === 0 ? (
        <div className="empty-state">
          <p className="text-slate-600">
            No File Templates yet for this tenant.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mt-8">
          {templates.map((tpl) => (
            <div key={tpl.id} className="catalog-card relative">
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
                {tpl.fields && <span className="text-xs text-slate-400 ml-auto">{tpl.fields.length} fields</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}