import React from 'react';
import { useAppState } from '../hooks/useAppState';
import { specToJSON, specToYAML } from '../services/specConverter';
import { convertToOpenAPI } from '../services/specConverter';

export const DownloadPanel: React.FC = () => {
  const { currentSpec, selectedTenantId, tenants } = useAppState();

  if (!currentSpec) {
    return null;
  }

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSON = () => {
    const json = specToJSON(currentSpec);
    downloadFile(
      json,
      `${currentSpec.info.title}.openapi.json`,
      'application/json'
    );
  };

  const handleDownloadYAML = () => {
    const yaml = specToYAML(currentSpec);
    downloadFile(
      yaml,
      `${currentSpec.info.title}.openapi.yaml`,
      'application/yaml'
    );
  };

  const handleBundledDownload = async () => {
    const tenant = tenants.find((t) => t.id === selectedTenantId);
    if (!tenant) return;

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Add all API specs for this tenant
      for (const api of tenant.apis) {
        const spec = convertToOpenAPI(api);
        const content = specToJSON(spec);
        zip.file(`${api.name}.openapi.json`, content);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${tenant.name}-apis.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to create bundle:', error);
    }
  };

  return (
    <div className="p-4 border-t border-gray-200 bg-white">
      <h3 className="font-semibold text-gray-800 mb-3">📥 Download</h3>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleDownloadJSON}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"
        >
          📄 JSON
        </button>
        <button
          onClick={handleDownloadYAML}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium"
        >
          📋 YAML
        </button>
        <button
          onClick={handleBundledDownload}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm font-medium"
        >
          📦 Bundle
        </button>
      </div>
    </div>
  );
};
