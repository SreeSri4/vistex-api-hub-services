import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTenantData } from "../context/TenantDataContext";
import type { TenantSummary } from "../types/tenant";

export default function TenantDetailPage() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { getTenant, loaded } = useTenantData();
  const tenant = getTenant(tenantId!);

  const [summary, setSummary] = useState<TenantSummary | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    fetch(`/api/tenants/${tenantId}/summary`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSummary(data))
      .catch(() => setSummary(null));
  }, [tenantId]);

  if (loaded && !tenant) {
    return (
      <div className="w-full px-6 md:px-10 lg:px-16 py-10">
        <p className="text-slate-600">Tenant not found. Check that it exists in Tenants/tenants.json.</p>
        <button onClick={() => navigate("/")} className="text-blue-600 text-sm mt-3">← Back to Tenants</button>
      </div>
    );
  }

  const subsections = [
    { key: "apis", label: "APIs", description: "Browse OpenAPI specs for this tenant.", count: summary?.apiCount },
    { key: "events", label: "Events", description: "Event catalog for this tenant.", count: summary?.eventCount },
    {
      key: "file-templates",
      label: "File Templates",
      description: "Reusable file templates for this tenant.",
      count: summary?.fileTemplateCount,
    },
  ];

  return (
    <div className="w-full px-6 md:px-10 lg:px-16 py-10">
      <button onClick={() => navigate("/")} className="text-sm text-blue-600 mb-4">← Back to Tenants</button>
      <h1 className="text-2xl font-semibold text-slate-900">{tenant?.name ?? tenantId}</h1>
      <p className="text-slate-600 mt-1">{tenant?.description}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-8">
        {subsections.map((s) => (
          <button
            key={s.key}
            onClick={() => navigate(`/tenants/${tenantId}/${s.key}`)}
            className="text-left bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 relative"
          >
            <span className="absolute left-0 top-5 bottom-5 w-1 bg-blue-600 rounded-r" />
            <h2 className="text-blue-700 font-semibold text-lg pl-3">{s.label}</h2>
            <div className="border-b border-gray-100 my-3" />
            <p className="text-sm text-gray-600 pl-3">{s.description}</p>
            {s.count !== undefined && <p className="text-xs text-gray-400 pl-3 mt-3">{s.count} items</p>}
          </button>
        ))}
      </div>
    </div>
  );
}
