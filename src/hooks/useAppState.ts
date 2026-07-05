import { create } from 'zustand';
import { AppState, Tenant, OpenAPISpec } from '../types';

export const useAppState = create<AppState>((set) => ({
  tenants: [],
  selectedTenantId: null,
  selectedApiId: null,
  loadingSpec: false,
  specError: null,
  currentSpec: null,

  setTenants: (tenants: Tenant[]) => set({ tenants }),
  setSelectedTenant: (tenantId: string | null) =>
    set({ selectedTenantId: tenantId }),
  setSelectedApi: (apiId: string | null) => set({ selectedApiId: apiId }),
  setCurrentSpec: (spec: OpenAPISpec | null) => set({ currentSpec: spec }),
  setLoadingSpec: (loading: boolean) => set({ loadingSpec: loading }),
  setSpecError: (error: string | null) => set({ specError: error }),
}));
