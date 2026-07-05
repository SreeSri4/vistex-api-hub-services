import React from 'react';
import { useAppState } from '../hooks/useAppState';
import { convertToOpenAPI } from '../services/specConverter';
import { APIDefinition } from '../types';

interface APINodeProps {
  api: APIDefinition;
  isSelected: boolean;
}

export const APINode: React.FC<APINodeProps> = ({ api, isSelected }) => {
  const { setSelectedApi, setCurrentSpec, setLoadingSpec, setSpecError } =
    useAppState();

  const handleClick = () => {
    setSelectedApi(api.id);
    setLoadingSpec(true);
    setSpecError(null);

    try {
      const spec = convertToOpenAPI(api);
      setCurrentSpec(spec);
      setLoadingSpec(false);
    } catch (error) {
      setSpecError(
        error instanceof Error ? error.message : 'Failed to convert spec'
      );
      setLoadingSpec(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left px-3 py-2 rounded-lg transition text-sm ${
        isSelected
          ? 'bg-blue-200 text-blue-900 font-semibold'
          : 'hover:bg-gray-100 text-gray-700'
      }`}
      title={api.description}
    >
      📘 {api.name}
      {api.endpoints && (
        <span className="text-xs ml-2 text-gray-600">
          ({api.endpoints.length})
        </span>
      )}
    </button>
  );
};
