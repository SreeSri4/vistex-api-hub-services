import React from 'react';
import { useAppState } from '../hooks/useAppState';
import { APINode } from './ApiNode';
import { Tenant } from '../types';

interface TenantTreeProps {
  tenants: Tenant[];
}

export const TenantTree: React.FC<TenantTreeProps> = ({ tenants }) => {
  const { selectedTenantId, setSelectedTenant, selectedApiId } = useAppState();

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto h-full p-4">
      <h2 className="text-lg font-bold text-gray-800 mb-4">📋 Tenants</h2>

      {tenants.length === 0 ? (
        <p className="text-gray-500 text-sm">Upload a config file to start</p>
      ) : (
        <div className="space-y-2">
          {tenants.map((tenant) => (
            <div key={tenant.id}>
              <button
                onClick={() =>
                  setSelectedTenant(
                    selectedTenantId === tenant.id ? null : tenant.id
                  )
                }
                className={`w-full text-left px-3 py-2 rounded-lg transition font-semibold ${
                  selectedTenantId === tenant.id
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-gray-200 text-gray-800'
                }`}
              >
                �� {tenant.name}
              </button>

              {selectedTenantId === tenant.id && (
                <div className="ml-4 mt-2 space-y-1 border-l-2 border-gray-300 pl-2">
                  {tenant.apis.map((api) => (
                    <APINode
                      key={api.id}
                      api={api}
                      isSelected={selectedApiId === api.id}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
