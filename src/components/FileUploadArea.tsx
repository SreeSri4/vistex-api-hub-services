import React, { useRef, useState } from "react";

interface JsonUploaderProps {
  /** Server endpoint this file gets POSTed to, e.g. /api/tenants/MX/apis/upload */
  uploadUrl: string;
  label?: string;
  /** Called after a successful upload so the caller can refresh its list */
  onUploaded?: () => void;
}

// Generic "upload a JSON file" button used on the APIs, Events, and File
// Templates pages. Posts the file as multipart/form-data (field "file") to
// the given endpoint, which validates it and writes it into the matching
// <tenant_id>/<Folder> directory on the server.
export function JsonUploader({ uploadUrl, label = "Upload JSON", onUploaded }: JsonUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(uploadUrl, { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? `Upload failed (HTTP ${res.status}).`);
      }

      onUploaded?.();
    } catch (err: any) {
      setError(err.message ?? "Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
      >
        {uploading ? "Uploading…" : `⬆ ${label}`}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleChange}
      />
      {error && <p className="text-red-600 text-xs max-w-xs text-right">{error}</p>}
    </div>
  );
}
