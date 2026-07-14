import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { TenantTabsHeader } from "../components/TenantTabsHeader";
import { SearchInput } from "../components/SearchInput";
import type { FileTemplateMapping, FileTemplateSpec } from "../types/tenant";

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// --- Decoders for the single-letter / single-word SAP-style codes ---

const MAPPING_TYPE: Record<string, { label: string; className: string }> = {
  I: { label: "Import", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  E: { label: "Export", className: "bg-violet-50 text-violet-700 border border-violet-200" },
};
const MAPPING_TYPE_BOTH = { label: "Both", className: "bg-slate-100 text-slate-600 border border-slate-200" };
function mappingTypeBadge(code?: string) {
  const trimmed = (code ?? "").trim();
  return trimmed ? MAPPING_TYPE[trimmed] ?? MAPPING_TYPE_BOTH : MAPPING_TYPE_BOTH;
}

const CONVERSIONS: Record<string, { label: string; className: string }> = {
  V: { label: "Skip Value Checks", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  X: { label: "Skip Conversions", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  Y: { label: "Skip Both", className: "bg-red-50 text-red-700 border border-red-200" },
};
const CONVERSIONS_ALL = { label: "All Checks", className: "bg-slate-100 text-slate-600 border border-slate-200" };
function conversionsBadge(code?: string) {
  const trimmed = (code ?? "").trim();
  return trimmed ? CONVERSIONS[trimmed] ?? CONVERSIONS_ALL : CONVERSIONS_ALL;
}

function Badge({ label, className }: { label: string; className: string }) {
  return <span className={`text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap ${className}`}>{label}</span>;
}

function CheckIcon({ checked }: { checked?: boolean }) {
  return checked ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-label="Yes">
      <circle cx="12" cy="12" r="10" className="fill-green-100" />
      <path d="M8 12.5l2.5 2.5L16 9" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <span className="text-slate-300 text-sm">—</span>
  );
}

function matchesQuery(m: FileTemplateMapping, q: string) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    m.fieldName?.toLowerCase().includes(needle) ||
    m.description?.toLowerCase().includes(needle) ||
    m.fieldMask?.toLowerCase().includes(needle) ||
    m.refField?.toLowerCase().includes(needle) ||
    false
  );
}

function MappingTable({ mappings }: { mappings: FileTemplateMapping[] }) {
  if (mappings.length === 0) {
    return <p className="text-sm text-slate-400 italic px-4 py-6">No mappings match your search in this section.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-200">
            <th className="py-2 pr-4 font-medium">#</th>
            <th className="py-2 pr-4 font-medium">Field</th>
            <th className="py-2 pr-4 font-medium">Description</th>
            <th className="py-2 pr-4 font-medium">Mask</th>
            <th className="py-2 pr-4 font-medium">Reference</th>
            <th className="py-2 pr-4 font-medium">Default</th>
            <th className="py-2 pr-4 font-medium">Type</th>
            <th className="py-2 pr-4 font-medium">Download As</th>
            <th className="py-2 pr-4 font-medium">Conversions</th>
            <th className="py-2 pr-4 font-medium text-center">Parent</th>
            <th className="py-2 pr-4 font-medium text-center">Required</th>
          </tr>
        </thead>
        <tbody>
          {mappings
            .slice()
            .sort((a, b) => (a.fieldPosition ?? 0) - (b.fieldPosition ?? 0))
            .map((m, i) => {
              const type = mappingTypeBadge(m.mappingType);
              const conv = conversionsBadge(m.conversions);
              return (
                <tr key={`${m.fieldName}-${i}`} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5 pr-4 text-slate-400">{m.fieldPosition ?? "—"}</td>
                  <td className="py-2.5 pr-4 font-mono text-[13px] text-slate-800">{m.fieldName}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{m.description || "—"}</td>
                  <td className="py-2.5 pr-4 font-mono text-[13px] text-slate-500">{m.fieldMask || "—"}</td>
                  <td className="py-2.5 pr-4 text-slate-500 font-mono text-[13px]">
                    {m.refSection || m.refField ? `${m.refSection ?? ""}${m.refField ? `.${m.refField}` : ""}` : "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-500 font-mono text-[13px]">{m.defaultValue || "—"}</td>
                  <td className="py-2.5 pr-4"><Badge {...type} /></td>
                  <td className="py-2.5 pr-4 text-slate-500">{m.valueForDownload || "—"}</td>
                  <td className="py-2.5 pr-4"><Badge {...conv} /></td>
                  <td className="py-2.5 pr-4 text-center"><CheckIcon checked={m.parentValue} /></td>
                  <td className="py-2.5 pr-4 text-center"><CheckIcon checked={m.mandatory} /></td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

export default function FileTemplateDetailPage() {
  const { tenantId, templateId } = useParams();
  const [template, setTemplate] = useState<FileTemplateSpec | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!tenantId || !templateId) return;
    setTemplate(undefined);
    fetch(`/api/tenants/${tenantId}/file-templates/${templateId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load file template (HTTP ${res.status}).`);
        return res.json();
      })
      .then((data) => {
        setTemplate(data);
        setError(null);
        // Expand every section by default — most templates have a handful.
        setExpanded(new Set((data.sections ?? []).map((s: any) => s.name)));
      })
      .catch((err) => setError(err.message ?? "Failed to load file template."));
  }, [tenantId, templateId]);

  const hasRichFormat = !!(template?.sections?.length || template?.mappings?.length);

  const mappingsBySection = useMemo(() => {
    const map = new Map<string, FileTemplateMapping[]>();
    for (const m of template?.mappings ?? []) {
      const list = map.get(m.sectionName) ?? [];
      list.push(m);
      map.set(m.sectionName, list);
    }
    return map;
  }, [template]);

  const knownSectionNames = new Set((template?.sections ?? []).map((s) => s.name));
  const orphanMappings = (template?.mappings ?? []).filter((m) => !knownSectionNames.has(m.sectionName));

  function toggleSection(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  function handleDownload() {
    if (!template) return;
    downloadFile(JSON.stringify(template, null, 2), `${template.id}.json`, "application/json");
  }

  if (template === undefined) {
    return (
      <div className="w-full px-6 md:px-10 lg:px-16 py-10">
        <TenantTabsHeader />
        <p className="text-slate-500 mt-8">Loading…</p>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="w-full px-6 md:px-10 lg:px-16 py-10">
        <TenantTabsHeader />
        <div className="empty-state">
          <p className="text-slate-600">{error || "File template not found."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-6 md:px-10 lg:px-16 py-10">
      <TenantTabsHeader />

      {/* Hero */}
      <div className="mt-8 catalog-card relative">
        <span className="absolute left-0 top-5 bottom-5 w-1 bg-[#B45309] rounded-r" />
        <div className="pl-3 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[#92400E] font-display">{template.name}</h1>
            {template.description && <p className="text-slate-600 mt-1">{template.description}</p>}
            <div className="flex flex-wrap gap-2 mt-3">
              {template.apiType && <Badge label={template.apiType} className="bg-[#FEF3E2] text-[#92400E] border border-amber-200" />}
              {template.application && <Badge label={template.application} className="bg-slate-100 text-slate-600 border border-slate-200" />}
              {template.version && <Badge label={`v${template.version}`} className="bg-slate-100 text-slate-600 border border-slate-200" />}
              {template.format && <Badge label={template.format} className="bg-slate-100 text-slate-600 border border-slate-200" />}
            </div>
            {template.endpoint && <p className="text-xs text-slate-400 mt-3 font-mono">{template.endpoint}</p>}
          </div>
          <button onClick={handleDownload} className="btn-secondary whitespace-nowrap">
            Download JSON
          </button>
        </div>
      </div>

      {/* Rich SAP-style sections/mappings */}
      {hasRichFormat && (
        <div className="mt-8">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <h2 className="text-slate-900">Sections</h2>
            <SearchInput value={query} onChange={setQuery} placeholder="Find a field" />
          </div>

          <div className="space-y-4">
            {(template.sections ?? []).map((section) => {
              const all = mappingsBySection.get(section.name) ?? [];
              const filtered = all.filter((m) => matchesQuery(m, query));
              const isOpen = expanded.has(section.name);
              return (
                <div key={section.name} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => toggleSection(section.name)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <svg
                        width="16" height="16" viewBox="0 0 24 24" fill="none"
                        className={`flex-shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
                      >
                        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display font-semibold text-slate-900">{section.name}</span>
                          {section.parentSection && (
                            <Badge label={`under ${section.parentSection}`} className="bg-slate-100 text-slate-500 border border-slate-200" />
                          )}
                        </div>
                        {section.description && <p className="text-sm text-slate-500 mt-0.5 truncate">{section.description}</p>}
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">{all.length} field{all.length === 1 ? "" : "s"}</span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 px-5 py-4">
                      {section.endpoint && <p className="text-xs text-slate-400 font-mono mb-3">{section.endpoint}</p>}
                      <MappingTable mappings={filtered} />
                    </div>
                  )}
                </div>
              );
            })}

            {orphanMappings.length > 0 && (
              <div className="bg-white border border-dashed border-amber-300 rounded-2xl overflow-hidden">
                <div className="px-5 py-4">
                  <span className="font-display font-semibold text-slate-900">Ungrouped fields</span>
                  <p className="text-sm text-slate-500 mt-0.5">
                    These mappings reference a section name that isn't defined above.
                  </p>
                </div>
                <div className="border-t border-slate-100 px-5 py-4">
                  <MappingTable mappings={orphanMappings.filter((m) => matchesQuery(m, query))} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legacy generic format — plain field list + sample content */}
      {!hasRichFormat && template.fields && template.fields.length > 0 && (
        <div className="mt-8 catalog-card">
          <h2 className="text-slate-900 mb-4">Fields</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Description</th>
                  <th className="py-2 pr-4 font-medium text-center">Required</th>
                </tr>
              </thead>
              <tbody>
                {template.fields.map((f) => (
                  <tr key={f.name} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 pr-4 font-mono text-[13px] text-slate-800">{f.name}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{f.type || "string"}</td>
                    <td className="py-2.5 pr-4 text-slate-600">{f.description || "—"}</td>
                    <td className="py-2.5 pr-4 text-center"><CheckIcon checked={f.required} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {template.sampleContent && (
            <>
              <h3 className="text-slate-900 mt-6 mb-2">Sample content</h3>
              <pre className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs font-mono overflow-x-auto">
                {template.sampleContent}
              </pre>
            </>
          )}
        </div>
      )}

      {!hasRichFormat && (!template.fields || template.fields.length === 0) && (
        <div className="empty-state">
          <p className="text-slate-600">This file template has no fields or sections defined yet.</p>
        </div>
      )}
    </div>
  );
}