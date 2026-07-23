import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { compareFileTemplates } from "../services/fileTemplateDiff";
import type { FileTemplateSpec, FileTemplateDiffResult, SectionDiff, MappingDiff, FieldChange } from "../types/tenant";

const FIELD_LABELS: Record<string, string> = {
  description: "Description",
  apiName: "API Name",
  parentSection: "Parent Section",
  fieldMask: "Mask",
  fieldPosition: "Position",
  refSection: "Ref Section",
  refField: "Ref Field",
  defaultValue: "Default Value",
  parentValue: "Parent Value",
  mappingType: "Mapping Type",
  mandatory: "Required",
  valueForDownload: "Download As",
  conversions: "Conversions",
  name: "Name",
  format: "Format",
  version: "Version",
  apiType: "API Type",
  application: "Application",
  sampleContent: "Sample Content",
  type: "Type",
  required: "Required",
};

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

function DiffBadge({ type }: { type: "added" | "removed" | "modified" }) {
  const styles = {
    added: "bg-green-100 text-green-800 border border-green-200",
    removed: "bg-red-100 text-red-800 border border-red-200",
    modified: "bg-amber-100 text-amber-800 border border-amber-200",
  };
  const labels = { added: "Added", removed: "Removed", modified: "Modified" };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${styles[type]}`}>
      {labels[type]}
    </span>
  );
}

function formatValue(val: any): string {
  if (val === undefined) return "—";
  if (val === null) return "null";
  if (typeof val === "string") return val.length > 80 ? val.slice(0, 80) + "…" : val;
  if (typeof val === "object") {
    const str = JSON.stringify(val);
    return str.length > 80 ? str.slice(0, 80) + "…" : str;
  }
  return String(val);
}

function FieldChangeRow({ label, change }: { label: string; change: FieldChange }) {
  return (
    <div className="flex items-start gap-2 text-[11px]">
      <span className="text-slate-500 font-medium whitespace-nowrap">{label}:</span>
      <div className="flex-1 min-w-0">
        <span className="text-red-600 line-through" title={String(change.old)}>
          {formatValue(change.old)}
        </span>
        <span className="text-slate-400 mx-1">&rarr;</span>
        <span className="text-green-600" title={String(change.new)}>
          {formatValue(change.new)}
        </span>
      </div>
    </div>
  );
}

function MetadataSection({ diff }: { diff: FileTemplateDiffResult }) {
  const changes: { label: string; change: FieldChange }[] = [];
  if (diff.descriptionChange) changes.push({ label: fieldLabel("name"), change: diff.descriptionChange });
  if (diff.summaryChange) changes.push({ label: fieldLabel("description"), change: diff.summaryChange });
  if (diff.formatChange) changes.push({ label: fieldLabel("format"), change: diff.formatChange });
  if (diff.apiTypeChange) changes.push({ label: fieldLabel("apiType"), change: diff.apiTypeChange });
  if (diff.apiNameChange) changes.push({ label: fieldLabel("apiName"), change: diff.apiNameChange });
  if (diff.applicationChange) changes.push({ label: fieldLabel("application"), change: diff.applicationChange });
  if (diff.sampleContentChange) changes.push({ label: fieldLabel("sampleContent"), change: diff.sampleContentChange });

  if (changes.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="font-display font-semibold text-lg text-slate-800 mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
        Metadata Changes ({changes.length})
      </h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="space-y-1.5">
          {changes.map((c) => (
            <FieldChangeRow key={c.label} label={c.label} change={c.change} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionDiffCard({ diff }: { diff: SectionDiff }) {
  return (
    <div className={`border rounded-lg p-3 ${
      diff.added ? "bg-green-50 border-green-200" :
      diff.removed ? "bg-red-50 border-red-200" :
      "bg-amber-50 border-amber-200"
    }`}>
      <div className="flex items-center gap-2">
        {diff.added && <DiffBadge type="added" />}
        {diff.removed && <DiffBadge type="removed" />}
        {diff.changed && <DiffBadge type="modified" />}
        <span className="font-mono text-sm text-slate-700">{diff.name}</span>
      </div>
      {diff.changed && diff.changes && Object.entries(diff.changes).length > 0 && (
        <div className="ml-6 mt-1.5 space-y-0.5">
          {Object.entries(diff.changes).map(([key, val]) => (
            <FieldChangeRow key={key} label={key} change={val} />
          ))}
        </div>
      )}
    </div>
  );
}

function MappingDiffCard({ diff }: { diff: MappingDiff }) {
  return (
    <div className={`border rounded-lg p-3 ${
      diff.added ? "bg-green-50 border-green-200" :
      diff.removed ? "bg-red-50 border-red-200" :
      "bg-amber-50 border-amber-200"
    }`}>
      <div className="flex items-center gap-2 flex-wrap">
        {diff.added && <DiffBadge type="added" />}
        {diff.removed && <DiffBadge type="removed" />}
        {diff.changed && <DiffBadge type="modified" />}
        <span className="text-xs text-slate-500">{diff.sectionName}</span>
        <span className="font-mono text-sm text-slate-700">{diff.fieldName}</span>
      </div>
      {diff.changed && diff.changes && Object.entries(diff.changes).length > 0 && (
        <div className="ml-6 mt-1.5 space-y-0.5">
          {Object.entries(diff.changes).map(([key, val]) => (
            <FieldChangeRow key={key} label={fieldLabel(key)} change={val} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTemplateComparePage() {
  const { tenantId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tpl1Id = searchParams.get("tpl1");
  const tpl2Id = searchParams.get("tpl2");

  const [tpl1, setTpl1] = useState<FileTemplateSpec | null | undefined>(undefined);
  const [tpl2, setTpl2] = useState<FileTemplateSpec | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId || !tpl1Id || !tpl2Id) return;
    setTpl1(undefined);
    setTpl2(undefined);
    setError(null);

    Promise.all([
      fetch(`/api/tenants/${tenantId}/file-templates/${tpl1Id}`).then((r) => {
        if (!r.ok) throw new Error(`Failed to load template "${tpl1Id}"`);
        return r.json();
      }),
      fetch(`/api/tenants/${tenantId}/file-templates/${tpl2Id}`).then((r) => {
        if (!r.ok) throw new Error(`Failed to load template "${tpl2Id}"`);
        return r.json();
      }),
    ])
      .then(([data1, data2]) => {
        setTpl1(data1);
        setTpl2(data2);
      })
      .catch((err) => setError(err.message ?? "Failed to load templates for comparison."));
  }, [tenantId, tpl1Id, tpl2Id]);

  const diff = useMemo<FileTemplateDiffResult | null>(() => {
    if (!tpl1 || !tpl2) return null;
    return compareFileTemplates(tpl1, tpl2);
  }, [tpl1, tpl2]);

  if (!tpl1Id || !tpl2Id) {
    return (
      <div className="w-full px-6 md:px-10 lg:px-16 py-10">
        <p className="text-slate-600">
          Select two file templates to compare from the{" "}
          <button
            onClick={() => navigate(`/tenants/${tenantId}/file-templates`)}
            className="text-blue-700 hover:underline"
          >
            File Templates page
          </button>
          .
        </p>
      </div>
    );
  }

  if (tpl1 === undefined || tpl2 === undefined) {
    return <p className="w-full px-6 md:px-10 lg:px-16 py-10 text-slate-600">Loading templates for comparison…</p>;
  }

  if (error || !tpl1 || !tpl2 || !diff) {
    return (
      <div className="w-full px-6 md:px-10 lg:px-16 py-10">
        <p className="text-red-600">{error || "Failed to load templates for comparison."}</p>
        <button
          onClick={() => navigate(`/tenants/${tenantId}/file-templates`)}
          className="text-blue-700 hover:underline mt-2"
        >
          ← Back to File Templates
        </button>
      </div>
    );
  }

  const hasChanges = diff.summary.totalChanges > 0;
  const hasSections = diff.sectionDiffs.length > 0;
  const hasMappings = diff.mappingDiffs.length > 0;
  const hasFields = diff.fieldDiffs.length > 0;

  return (
    <div className="min-h-screen bg-vistex-canvas">
      <div className="sticky top-12 z-40">
        <div className="bg-gradient-to-r from-[#0f2847] via-[#1a3e6f] to-[#2a5298] text-white px-6 md:px-10 lg:px-16 py-5 shadow-md">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-tight">
                File Template Version Comparison
              </h1>
              <p className="text-sm text-blue-100/80 mt-1">
                Comparing{" "}
                <span className="font-semibold">{tpl1.name}</span>
                {tpl1.version && <span className="text-blue-200"> v{tpl1.version}</span>}
                {" "}with{" "}
                <span className="font-semibold">{tpl2.name}</span>
                {tpl2.version && <span className="text-blue-200"> v{tpl2.version}</span>}
              </p>
            </div>
            <button
              onClick={() => navigate(`/tenants/${tenantId}/file-templates`)}
              className="px-4 py-2 bg-white/10 text-white border border-white/30 rounded-lg text-sm font-semibold hover:bg-white/20 whitespace-nowrap transition"
            >
              ← Back to File Templates
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-8 lg:px-12 py-6">
        {/* Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <h2 className="font-display font-semibold text-lg text-slate-900 mb-3">Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">{diff.summary.totalChanges}</div>
              <div className="text-xs text-slate-500 mt-1">Total Changes</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{diff.summary.metadataChanges}</div>
              <div className="text-xs text-slate-500 mt-1">Metadata Changes</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-700">
                {diff.summary.sectionsAdded + diff.summary.sectionsRemoved + diff.summary.sectionsModified}
              </div>
              <div className="text-xs text-slate-500 mt-1">Section Changes</div>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-700">
                {diff.summary.mappingsAdded + diff.summary.mappingsRemoved + diff.summary.mappingsModified + diff.fieldDiffs.length}
              </div>
              <div className="text-xs text-slate-500 mt-1">Field Changes</div>
            </div>
          </div>
        </div>

        {/* No changes */}
        {!hasChanges && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-lg text-slate-600">These two file template versions are identical.</p>
            <p className="text-sm text-slate-400 mt-2">No sections, mappings, or metadata were changed.</p>
          </div>
        )}

        {/* Metadata Changes */}
        <MetadataSection diff={diff} />

        {/* Section Changes */}
        {hasSections && (
          <div className="mb-6">
            <h2 className="font-display font-semibold text-lg text-purple-800 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Section Changes ({diff.sectionDiffs.length})
            </h2>
            <div className="space-y-2">
              {diff.sectionDiffs.map((sd, i) => (
                <SectionDiffCard key={i} diff={sd} />
              ))}
            </div>
          </div>
        )}

        {/* Mapping Changes */}
        {hasMappings && (
          <div className="mb-6">
            <h2 className="font-display font-semibold text-lg text-amber-800 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
              Mapping Changes ({diff.mappingDiffs.length})
            </h2>
            <div className="space-y-2">
              {diff.mappingDiffs.map((md, i) => (
                <MappingDiffCard key={i} diff={md} />
              ))}
            </div>
          </div>
        )}

        {/* Legacy Field Changes */}
        {hasFields && (
          <div className="mb-6">
            <h2 className="font-display font-semibold text-lg text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
              Legacy Field Changes ({diff.fieldDiffs.length})
            </h2>
            <div className="space-y-2">
              {diff.fieldDiffs.map((fd, i) => (
                <MappingDiffCard key={i} diff={fd} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
