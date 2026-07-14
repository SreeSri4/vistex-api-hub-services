import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTenantData } from "../context/TenantDataContext";
import { SearchInput } from "../components/SearchInput";
import { apiTypeBadge, mappingTypeBadge, conversionsBadge, type CodeBadge } from "../services/fileTemplateCodes";
import type { FileTemplateMapping, FileTemplateSection, FileTemplateSpec } from "../types/tenant";

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

function Badge({ label, className }: CodeBadge) {
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
            <th className="py-2 pr-4 font-medium">API Name</th>
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
            .map((m, i) => (
              <tr key={`${m.fieldName}-${i}`} className="border-b border-slate-100 last:border-0">
                <td className="py-2.5 pr-4 text-slate-400">{m.fieldPosition ?? "—"}</td>
                <td className="py-2.5 pr-4 font-mono text-[13px] text-slate-800">{m.fieldName}</td>
                <td className="py-2.5 pr-4 text-slate-600">{m.description || "—"}</td>
                <td className="py-2.5 pr-4 font-mono text-[13px] text-slate-500">{m.apiName || "—"}</td>
                <td className="py-2.5 pr-4 font-mono text-[13px] text-slate-500">{m.fieldMask || "—"}</td>
                <td className="py-2.5 pr-4 text-slate-500 font-mono text-[13px]">
                  {m.refSection || m.refField ? `${m.refSection ?? ""}${m.refField ? `.${m.refField}` : ""}` : "—"}
                </td>
                <td className="py-2.5 pr-4 text-slate-500 font-mono text-[13px]">{m.defaultValue || "—"}</td>
                <td className="py-2.5 pr-4"><Badge {...mappingTypeBadge(m.mappingType)} /></td>
                <td className="py-2.5 pr-4 text-slate-500">{m.valueForDownload || "—"}</td>
                <td className="py-2.5 pr-4"><Badge {...conversionsBadge(m.conversions)} /></td>
                <td className="py-2.5 pr-4 text-center"><CheckIcon checked={m.parentValue} /></td>
                <td className="py-2.5 pr-4 text-center"><CheckIcon checked={m.mandatory} /></td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

interface SectionNode {
  section: FileTemplateSection;
  children: SectionNode[];
}

function buildSectionTree(sections: FileTemplateSection[]): SectionNode[] {
  const byName = new Map(sections.map((s) => [s.name, s]));
  const childrenByParent = new Map<string, FileTemplateSection[]>();
  const roots: FileTemplateSection[] = [];

  for (const s of sections) {
    const parent = s.parentSection?.trim();
    if (parent && byName.has(parent) && parent !== s.name) {
      const list = childrenByParent.get(parent) ?? [];
      list.push(s);
      childrenByParent.set(parent, list);
    } else {
      roots.push(s);
    }
  }

  const build = (section: FileTemplateSection): SectionNode => ({
    section,
    children: (childrenByParent.get(section.name) ?? []).map(build),
  });

  return roots.map(build);
}

function SectionNodeView({
  node,
  depth,
  mappingsBySection,
  expanded,
  onToggle,
  query,
}: {
  node: SectionNode;
  depth: number;
  mappingsBySection: Map<string, FileTemplateMapping[]>;
  expanded: Set<string>;
  onToggle: (name: string) => void;
  query: string;
}) {
  const { section, children } = node;
  const all = mappingsBySection.get(section.name) ?? [];
  const filtered = all.filter((m) => matchesQuery(m, query));
  const isOpen = expanded.has(section.name);

  return (
    <div className={depth > 0 ? "relative pl-6 border-l-2 border-amber-200" : ""}>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <button
          onClick={() => onToggle(section.name)}
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
              <span className="font-display font-semibold text-slate-900">{section.name}</span>
              {section.description && <p className="text-sm text-slate-500 mt-0.5 truncate">{section.description}</p>}
            </div>
          </div>
          <span className="text-xs text-slate-400 flex-shrink-0">{all.length} field{all.length === 1 ? "" : "s"}</span>
        </button>
        {isOpen && (
          <div className="border-t border-slate-100 px-5 py-4">
            {section.apiName && <p className="text-xs text-slate-400 font-mono mb-3">{section.apiName}</p>}
            <MappingTable mappings={filtered} />
          </div>
        )}
      </div>

      {children.length > 0 && (
        <div className="mt-3 space-y-3">
          {children.map((child) => (
            <SectionNodeView
              key={child.section.name}
              node={child}
              depth={depth + 1}
              mappingsBySection={mappingsBySection}
              expanded={expanded}
              onToggle={onToggle}
              query={query}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTemplateDetailPage() {
  const { tenantId, templateId } = useParams();
  const navigate = useNavigate();
  const { getTenant } = useTenantData();
  const tenant = getTenant(tenantId!);

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

  const sectionTree = useMemo(() => buildSectionTree(template?.sections ?? []), [template]);

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

  const backToList = () => navigate(`/tenants/${tenantId}/file-templates`);

  return (
    <div className="min-h-screen bg-vistex-canvas">
      {/* Dedicated breadcrumb with a clear way back to the File Templates
          list — this page intentionally doesn't reuse the tab bar, since
          drilling into one item shouldn't look like just another tab. */}
      <div className="sticky top-12 z-40">
        <div className="bg-[#0f2847] text-[#9fb8d9] text-xs px-6 md:px-10 lg:px-16 py-2 flex items-center gap-2 overflow-x-auto">
          <button onClick={() => navigate("/")} className="hover:text-white whitespace-nowrap">Tenants</button>
          <span aria-hidden="true">›</span>
          <button onClick={() => navigate(`/tenants/${tenantId}/apis`)} className="hover:text-white whitespace-nowrap">
            {tenant?.name ?? tenantId}
          </button>
          <span aria-hidden="true">›</span>
          <button onClick={backToList} className="hover:text-white whitespace-nowrap">File Templates</button>
          <span aria-hidden="true">›</span>
          <span className="text-white font-medium whitespace-nowrap">{template?.name ?? templateId}</span>
        </div>
      </div>

      <div className="w-full px-6 md:px-10 lg:px-16 py-8">
        <button onClick={backToList} className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 mb-6">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5M5 12L11 6M5 12L11 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to File Templates
        </button>

        {template === undefined ? (
          <p className="text-slate-500">Loading…</p>
        ) : error || !template ? (
          <div className="empty-state">
            <p className="text-slate-600">{error || "File template not found."}</p>
          </div>
        ) : (
          <>
            {/* Hero */}
            <div className="catalog-card relative">
              <span className="absolute left-0 top-5 bottom-5 w-1 bg-[#B45309] rounded-r" />
              <div className="pl-3 flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-[#92400E] font-display">{template.name}</h1>
                  {template.description && <p className="text-slate-600 mt-1">{template.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {hasRichFormat && <Badge {...apiTypeBadge(template.apiType)} />}
                    {template.application && <Badge label={template.application} className="bg-slate-100 text-slate-600 border border-slate-200" />}
                    {template.version && <Badge label={`v${template.version}`} className="bg-slate-100 text-slate-600 border border-slate-200" />}
                    {template.format && <Badge label={template.format} className="bg-slate-100 text-slate-600 border border-slate-200" />}
                  </div>
                  {template.apiName && <p className="text-xs text-slate-400 mt-3 font-mono">{template.apiName}</p>}
                </div>
                <button onClick={handleDownload} className="btn-secondary whitespace-nowrap">
                  Download JSON
                </button>
              </div>
            </div>

            {/* Rich SAP-style sections/mappings, shown as a hierarchy */}
            {hasRichFormat && (
              <div className="mt-8">
                <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                  <h2 className="text-slate-900">Sections</h2>
                  <SearchInput value={query} onChange={setQuery} placeholder="Find a field" />
                </div>

                <div className="space-y-3">
                  {sectionTree.map((node) => (
                    <SectionNodeView
                      key={node.section.name}
                      node={node}
                      depth={0}
                      mappingsBySection={mappingsBySection}
                      expanded={expanded}
                      onToggle={toggleSection}
                      query={query}
                    />
                  ))}

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
          </>
        )}
      </div>
    </div>
  );
}