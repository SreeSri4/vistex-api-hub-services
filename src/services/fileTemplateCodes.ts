export interface CodeBadge {
  label: string;
  className: string;
}

// API Type: " " (space) = Get & Post, "A" = Process, "X" = Patch, "P" = Post
const API_TYPE: Record<string, CodeBadge> = {
  A: { label: "Process", className: "bg-violet-50 text-violet-700 border border-violet-200" },
  X: { label: "Patch", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  P: { label: "Post", className: "bg-blue-50 text-blue-700 border border-blue-200" },
};
const API_TYPE_DEFAULT: CodeBadge = { label: "Get & Post", className: "bg-slate-100 text-slate-600 border border-slate-200" };
export function apiTypeBadge(code?: string): CodeBadge {
  const trimmed = (code ?? "").trim();
  return trimmed ? API_TYPE[trimmed.toUpperCase()] ?? API_TYPE_DEFAULT : API_TYPE_DEFAULT;
}

// Mapping Type: "I" = Import, "E" = Export, " " (space) = Import & Export
const MAPPING_TYPE: Record<string, CodeBadge> = {
  I: { label: "Import", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  E: { label: "Export", className: "bg-violet-50 text-violet-700 border border-violet-200" },
};
const MAPPING_TYPE_DEFAULT: CodeBadge = { label: "Import & Export", className: "bg-slate-100 text-slate-600 border border-slate-200" };
export function mappingTypeBadge(code?: string): CodeBadge {
  const trimmed = (code ?? "").trim();
  return trimmed ? MAPPING_TYPE[trimmed.toUpperCase()] ?? MAPPING_TYPE_DEFAULT : MAPPING_TYPE_DEFAULT;
}

// Conversions: " " (space) = All Checks, "V" = Skip Value Checks, "X" = Skip Conversions, "Y" = Skip Skip Value Checks & Conversions
const CONVERSIONS: Record<string, CodeBadge> = {
  V: { label: "Skip Value Checks", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  X: { label: "Skip Conversions", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  Y: { label: "Skip Value Checks & Conversions", className: "bg-red-50 text-red-700 border border-red-200" },
};
const CONVERSIONS_DEFAULT: CodeBadge = { label: "All Checks", className: "bg-slate-100 text-slate-600 border border-slate-200" };
export function conversionsBadge(code?: string): CodeBadge {
  const trimmed = (code ?? "").trim();
  return trimmed ? CONVERSIONS[trimmed.toUpperCase()] ?? CONVERSIONS_DEFAULT : CONVERSIONS_DEFAULT;
}