import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { TenantTabsHeader } from "../components/TenantTabsHeader";
import { SearchInput } from "../components/SearchInput";
import type { EventSpec } from "../types/tenant";

export default function EventsPage() {
  const { tenantId } = useParams();

  const [events, setEvents] = useState<EventSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (event) =>
        event.name.toLowerCase().includes(q) ||
        event.description?.toLowerCase().includes(q) ||
        event.channel?.toLowerCase().includes(q) ||
        event.type?.toLowerCase().includes(q) ||
        event.tags?.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [events, query]);

  return (
    <div className="w-full px-6 md:px-10 lg:px-16 py-10">
      <TenantTabsHeader />

      {events.length > 0 && (
        <div className="flex justify-end mt-6">
          <SearchInput value={query} onChange={setQuery} placeholder="Find an Event" />
        </div>
      )}

      {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

      {loading ? (
        <p className="text-slate-500 mt-8">Loading…</p>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <p className="text-slate-600">
            No Events yet for this tenant.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p className="text-slate-600">No events match "{query}".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mt-8">
          {filtered.map((event) => (
            <div key={event.id} className="catalog-card relative">
              <span className="absolute left-0 top-5 bottom-5 w-1 bg-[#7C3AED] rounded-r" />
              <div className="pl-3 flex items-center justify-between gap-2">
                <h2 className="font-display font-semibold text-lg text-[#6D28D9] leading-snug">{event.name}</h2>
                {event.version && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded flex-shrink-0">v{event.version}</span>
                )}
              </div>
              <p className="text-sm text-slate-600 mt-2 pl-3">{event.description}</p>
              <div className="flex flex-wrap gap-2 mt-3 pl-3 items-center">
                {event.type && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#F3EEFE] text-[#6D28D9]">
                    {event.type}
                  </span>
                )}
                {event.channel && <span className="text-xs text-slate-400 font-mono truncate">{event.channel}</span>}
              </div>
              {event.tags && event.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pl-3">
                  {event.tags.map((tag) => (
                    <span key={tag} className="text-[11px] bg-slate-50 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded">
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