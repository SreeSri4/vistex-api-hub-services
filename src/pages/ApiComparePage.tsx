import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTenantData } from "../context/TenantDataContext";
import { compareApis } from "../services/apiDiff";
import { expandSimpleApi } from "../shared/simpleApiFormat";
import type { ApiSpec, ApiDiffResult, EndpointDiff, SchemaChange, FieldChange } from "../types/tenant";

const METHOD_BADGE_COLOR: Record<string, string> = {
  GET: "bg-green-100 text-green-800",
  POST: "bg-blue-100 text-blue-800",
  PUT: "bg-amber-100 text-amber-800",
  PATCH: "bg-amber-100 text-amber-800",
  DELETE: "bg-red-100 text-red-800",
};

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
        <span className="text-slate-400 mx-1">→</span>
        <span className="text-green-600" title={String(change.new)}>
          {formatValue(change.new)}
        </span>
      </div>
    </div>
  );
}

function SchemaChangesList({ changes }: { changes: SchemaChange[] }) {
  if (!changes || changes.length === 0) return null;
  return (
    <div className="ml-3 mt-1 space-y-0.5">
      {changes.map((c, i) => (
        <div key={i} className="flex items-start gap-1.5 text-[11px]">
          {c.type === "added" && <DiffBadge type="added" />}
          {c.type === "removed" && <DiffBadge type="removed" />}
          {c.type === "modified" && <DiffBadge type="modified" />}
          <div className="flex-1 min-w-0">
            <span className="font-mono text-slate-600">{c.path}</span>
            {c.type === "modified" && (
              <div className="flex items-center gap-1 ml-2">
                <span className="text-red-600 line-through" title={String(c.oldValue)}>
                  {formatValue(c.oldValue)}
                </span>
                <span className="text-slate-400">→</span>
                <span className="text-green-600" title={String(c.newValue)}>
                  {formatValue(c.newValue)}
                </span>
              </div>
            )}
            {c.type === "added" && (
              <span className="ml-2 text-green-700">added</span>
            )}
            {c.type === "removed" && (
              <span className="ml-2 text-red-700">removed</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function EndpointDiffCard({ diff }: { diff: EndpointDiff }) {
  const isAdded = diff.added;
  const isRemoved = diff.removed;
  const isModified = diff.changed;

  const hasParamChanges = diff.parameterChanges && diff.parameterChanges.length > 0;
  const hasRequestBodyChanges = diff.requestBodyDiff && (diff.requestBodyDiff.added || diff.requestBodyDiff.removed || diff.requestBodyDiff.changed);
  const hasResponseChanges = diff.responseChanges && diff.responseChanges.length > 0;
  const hasMetadataChanges = diff.summaryChange || diff.descriptionChange;

  return (
    <div
      className={`border rounded-xl overflow-hidden ${
        isAdded
          ? "bg-green-50 border-green-200"
          : isRemoved
          ? "bg-red-50 border-red-200"
          : "bg-white border-amber-200"
      }`}
    >
      {/* Header */}
      <div className={`px-4 py-3 flex items-center gap-3 ${
        isAdded ? "bg-green-100" : isRemoved ? "bg-red-100" : "bg-amber-50"
      }`}>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded ${
            METHOD_BADGE_COLOR[diff.method] ?? "bg-slate-100 text-slate-600"
          }`}
        >
          {diff.method}
        </span>
        <span className="font-mono text-sm text-slate-800">{diff.path}</span>
        <DiffBadge type={isAdded ? "added" : isRemoved ? "removed" : "modified"} />
      </div>

      {/* Details */}
      {isModified && (
        <div className="px-4 py-3 space-y-3">
          {/* Summary/Description changes */}
          {hasMetadataChanges && (
            <div className="text-xs">
              <span className="font-semibold text-slate-700">Metadata:</span>
              <div className="ml-4 mt-1 space-y-0.5">
                {diff.summaryChange && (
                  <FieldChangeRow label="Summary" change={diff.summaryChange} />
                )}
                {diff.descriptionChange && (
                  <FieldChangeRow label="Description" change={diff.descriptionChange} />
                )}
              </div>
            </div>
          )}

          {/* Parameter changes */}
          {hasParamChanges && (
            <div className="text-xs">
              <span className="font-semibold text-slate-700">Parameters ({diff.parameterChanges!.length} changed):</span>
              <div className="ml-4 mt-1 space-y-1.5">
                {diff.parameterChanges!.map((p, i) => (
                  <div key={i} className="flex items-start gap-2">
                    {p.added && <DiffBadge type="added" />}
                    {p.removed && <DiffBadge type="removed" />}
                    {p.changed && <DiffBadge type="modified" />}
                    <div className="flex-1">
                      <span className="font-mono text-slate-700">{p.in}:{p.name}</span>
                      {p.changes && Object.entries(p.changes).length > 0 && (
                        <div className="ml-2 mt-0.5 space-y-0.5">
                          {Object.entries(p.changes).map(([key, val]) => (
                            <FieldChangeRow key={key} label={key} change={val} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Request body changes */}
          {hasRequestBodyChanges && (
            <div className="text-xs">
              <span className="font-semibold text-slate-700">Request Body:</span>
              <div className="ml-4 mt-1">
                {diff.requestBodyDiff!.added && (
                  <span className="text-green-700">New request body added</span>
                )}
                {diff.requestBodyDiff!.removed && (
                  <span className="text-red-700">Request body removed</span>
                )}
                {diff.requestBodyDiff!.changes && Object.entries(diff.requestBodyDiff!.changes).length > 0 && (
                  <div className="space-y-0.5">
                    {Object.entries(diff.requestBodyDiff!.changes).map(([key, val]) => (
                      <FieldChangeRow key={key} label={key} change={val} />
                    ))}
                  </div>
                )}
                {diff.requestBodyDiff!.contentChanges && diff.requestBodyDiff!.contentChanges.length > 0 && (
                  <div>
                    <span className="text-slate-600 font-medium">Schema fields:</span>
                    <SchemaChangesList changes={diff.requestBodyDiff!.contentChanges} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Response changes */}
          {hasResponseChanges && (
            <div className="text-xs">
              <span className="font-semibold text-slate-700">Responses ({diff.responseChanges!.length} changed):</span>
              <div className="ml-4 mt-1 space-y-2">
                {diff.responseChanges!.map((r, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-2">
                      {r.added && <DiffBadge type="added" />}
                      {r.removed && <DiffBadge type="removed" />}
                      {r.changed && <DiffBadge type="modified" />}
                      <span className="font-mono text-slate-700">{r.statusCode}</span>
                    </div>
                    {r.changed && (
                      <div className="ml-6 space-y-0.5">
                        {r.descriptionChange && (
                          <FieldChangeRow label="Description" change={r.descriptionChange} />
                        )}
                        {r.schemaChanges && r.schemaChanges.length > 0 && (
                          <div>
                            <span className="text-slate-500 font-medium">Schema fields:</span>
                            <SchemaChangesList changes={r.schemaChanges} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApiComparePage() {
  const { tenantId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getTenant } = useTenantData();
  const tenant = getTenant(tenantId!);

  const api1Id = searchParams.get("api1");
  const api2Id = searchParams.get("api2");

  const [api1, setApi1] = useState<ApiSpec | null | undefined>(undefined);
  const [api2, setApi2] = useState<ApiSpec | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId || !api1Id || !api2Id) return;
    setApi1(undefined);
    setApi2(undefined);
    setError(null);

    Promise.all([
      fetch(`/api/tenants/${tenantId}/apis/${api1Id}`).then((r) => {
        if (!r.ok) throw new Error(`Failed to load API "${api1Id}"`);
        return r.json();
      }),
      fetch(`/api/tenants/${tenantId}/apis/${api2Id}`).then((r) => {
        if (!r.ok) throw new Error(`Failed to load API "${api2Id}"`);
        return r.json();
      }),
    ])
      .then(([data1, data2]) => {
        setApi1(data1);
        setApi2(data2);
      })
      .catch((err) => setError(err.message ?? "Failed to load APIs for comparison."));
  }, [tenantId, api1Id, api2Id]);

  const diff = useMemo<ApiDiffResult | null>(() => {
    if (!api1 || !api2) return null;
    const expanded1 = expandSimpleApi(api1);
    const expanded2 = expandSimpleApi(api2);
    return compareApis(
      expanded1 as unknown as ApiSpec,
      expanded2 as unknown as ApiSpec
    );
  }, [api1, api2]);

  if (!api1Id || !api2Id) {
    return (
      <div className="w-full px-6 md:px-10 lg:px-16 py-10">
        <p className="text-slate-600">
          Select two APIs to compare from the{" "}
          <button
            onClick={() => navigate(`/tenants/${tenantId}/apis`)}
            className="text-blue-700 hover:underline"
          >
            APIs page
          </button>
          .
        </p>
      </div>
    );
  }

  if (api1 === undefined || api2 === undefined) {
    return <p className="w-full px-6 md:px-10 lg:px-16 py-10 text-slate-600">Loading APIs for comparison…</p>;
  }

  if (error || !api1 || !api2 || !diff) {
    return (
      <div className="w-full px-6 md:px-10 lg:px-16 py-10">
        <p className="text-red-600">{error || "Failed to load APIs for comparison."}</p>
        <button
          onClick={() => navigate(`/tenants/${tenantId}/apis`)}
          className="text-blue-700 hover:underline mt-2"
        >
          ← Back to APIs
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vistex-canvas">
      <div className="sticky top-12 z-40">
        <div className="bg-[#0f2847] text-[#9fb8d9] text-xs px-6 md:px-10 lg:px-16 py-2 flex items-center gap-2 overflow-x-auto">
          <button onClick={() => navigate("/")} className="hover:text-white whitespace-nowrap">
            Tenants
          </button>
          <span aria-hidden="true">›</span>
          <button
            onClick={() => navigate(`/tenants/${tenantId}/apis`)}
            className="hover:text-white whitespace-nowrap"
          >
            {tenant?.name ?? tenantId}
          </button>
          <span aria-hidden="true">›</span>
          <span className="text-white font-medium whitespace-nowrap">Compare APIs</span>
        </div>

        <div className="bg-gradient-to-r from-[#0f2847] via-[#1a3e6f] to-[#2a5298] text-white px-6 md:px-10 lg:px-16 py-5 shadow-md">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-tight">
                API Version Comparison
              </h1>
              <p className="text-sm text-blue-100/80 mt-1">
                Comparing{" "}
                <span className="font-semibold">{api1.name}</span>
                {api1.version && <span className="text-blue-200"> v{api1.version}</span>}
                {" "}with{" "}
                <span className="font-semibold">{api2.name}</span>
                {api2.version && <span className="text-blue-200"> v{api2.version}</span>}
              </p>
            </div>
            <button
              onClick={() => navigate(`/tenants/${tenantId}/apis`)}
              className="px-4 py-2 bg-white/10 text-white border border-white/30 rounded-lg text-sm font-semibold hover:bg-white/20 whitespace-nowrap transition"
            >
              ← Back to APIs
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
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{diff.summary.endpointsAdded}</div>
              <div className="text-xs text-slate-500 mt-1">Endpoints Added</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-700">{diff.summary.endpointsRemoved}</div>
              <div className="text-xs text-slate-500 mt-1">Endpoints Removed</div>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-700">{diff.summary.endpointsModified}</div>
              <div className="text-xs text-slate-500 mt-1">Endpoints Modified</div>
            </div>
          </div>
        </div>

        {/* No changes */}
        {diff.summary.totalChanges === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-lg text-slate-600">These two API versions are identical.</p>
            <p className="text-sm text-slate-400 mt-2">No endpoints were added, removed, or modified.</p>
          </div>
        )}

        {/* Added Endpoints */}
        {diff.addedEndpoints.length > 0 && (
          <div className="mb-6">
            <h2 className="font-display font-semibold text-lg text-green-800 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Added Endpoints ({diff.addedEndpoints.length})
            </h2>
            <div className="space-y-3">
              {diff.addedEndpoints.map((ep, i) => (
                <EndpointDiffCard key={i} diff={ep} />
              ))}
            </div>
          </div>
        )}

        {/* Removed Endpoints */}
        {diff.removedEndpoints.length > 0 && (
          <div className="mb-6">
            <h2 className="font-display font-semibold text-lg text-red-800 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              Removed Endpoints ({diff.removedEndpoints.length})
            </h2>
            <div className="space-y-3">
              {diff.removedEndpoints.map((ep, i) => (
                <EndpointDiffCard key={i} diff={ep} />
              ))}
            </div>
          </div>
        )}

        {/* Modified Endpoints */}
        {diff.modifiedEndpoints.length > 0 && (
          <div className="mb-6">
            <h2 className="font-display font-semibold text-lg text-amber-800 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
              Modified Endpoints ({diff.modifiedEndpoints.length})
            </h2>
            <div className="space-y-3">
              {diff.modifiedEndpoints.map((ep, i) => (
                <EndpointDiffCard key={i} diff={ep} />
              ))}
            </div>
          </div>
        )}

        {/* Unchanged Endpoints */}
        {diff.unchangedEndpoints.length > 0 && (
          <div className="mb-6">
            <h2 className="font-display font-semibold text-lg text-slate-600 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
              Unchanged Endpoints ({diff.unchangedEndpoints.length})
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-slate-100">
              {diff.unchangedEndpoints.map((ep, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      METHOD_BADGE_COLOR[ep.method] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-mono text-sm text-slate-700">{ep.path}</span>
                  <span className="text-xs text-slate-500 ml-auto truncate">{ep.summary}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
