import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTenantData } from "../context/TenantDataContext";
import type { EventSpec } from "../types/tenant";

export default function EventsPage() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { getTenant } = useTenantData();
  const tenant = getTenant(tenantId!);

  const [events, setEvents] = useState<EventSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/events`);
      if (!res.ok) throw new Error(`Failed to load events (HTTP ${res.status}).`);
      const data = await res.json();
      setEvents(data.items ?? []);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? "Failed to load events.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="w-full px-6 md:px-10 lg:px-16 py-10">
      <div>
        <button onClick={() => navigate(`/tenants/${tenantId}`)} className="text-sm text-blue-600 mb-4">
          ← Back to {tenant?.name ?? tenantId}
        </button>
        <h1 className="text-2xl font-semibold text-slate-900">Events — {tenant?.name ?? tenantId}</h1>
        <p className="text-slate-600 mt-1">{events.length} event{events.length === 1 ? "" : "s"} available</p>
      </div>

      {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

      {loading ? (
        <p className="text-slate-500 mt-8">Loading…</p>
      ) : events.length === 0 ? (
        <div className="mt-16 text-center text-slate-500 bg-white border border-dashed border-slate-300 rounded-xl py-16">
          No events yet for this tenant. Register one via <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">POST /api/tenants/{tenantId}/events/upload</code>.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mt-8">
          {events.map((event) => (
            <div key={event.id} className="text-left bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-blue-700 font-semibold text-lg">{event.name}</h2>
                {event.version && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">v{event.version}</span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-2">{event.description}</p>
              <div className="flex flex-wrap gap-2 mt-3 items-center">
                {event.type && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                    {event.type}
                  </span>
                )}
                {event.channel && <span className="text-xs text-gray-400 font-mono">{event.channel}</span>}
              </div>
              {event.tags && event.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {event.tags.map((tag) => (
                    <span key={tag} className="text-[11px] bg-gray-50 border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}