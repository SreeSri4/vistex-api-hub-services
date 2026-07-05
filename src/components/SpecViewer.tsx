import React from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import { useAppState } from '../hooks/useAppState';

export const SpecViewer: React.FC = () => {
  const { currentSpec, loadingSpec, specError } = useAppState();

  if (loadingSpec) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600">Loading specification...</p>
      </div>
    );
  }

  if (specError) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-semibold">Error</h3>
        <p className="text-red-700 text-sm">{specError}</p>
      </div>
    );
  }

  if (!currentSpec) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Select an API to view documentation</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <SwaggerUI spec={currentSpec} />
    </div>
  );
};
