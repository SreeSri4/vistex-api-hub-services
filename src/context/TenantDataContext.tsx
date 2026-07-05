import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { TenantMeta } from "../types/tenant";

// Tenants are now read from the server, which in turn reads them from
// Tenants/tenants.json on disk (see src/server/index.ts). APIs, Events, and
// File Templates are NOT embedded here anymore — each tenant page fetches
// its own slice from /api/tenants/:tenantId/<apis|events|file-templates>.
interface TenantContextValue {
  tenants: TenantMeta[];
  loaded: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getTenant: (tenantId: string) => TenantMeta | undefined;
}

const TenantDataContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantDataProvider({ children }: { children: ReactNode }) {
  const [tenants, setTenants] = useState<TenantMeta[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/tenants");
      if (!res.ok) throw new Error(`Failed to load tenants (HTTP ${res.status}).`);
      const data = await res.json();
      setTenants(data.tenants ?? []);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? "Failed to load tenants.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getTenant = (tenantId: string) => tenants.find((t) => t.id === tenantId);

  return (
    <TenantDataContext.Provider value={{ tenants, loaded, error, refresh, getTenant }}>
      {children}
    </TenantDataContext.Provider>
  );
}

export function useTenantData() {
  const ctx = useContext(TenantDataContext);
  if (!ctx) throw new Error("useTenantData must be used within TenantDataProvider");
  return ctx;
}
