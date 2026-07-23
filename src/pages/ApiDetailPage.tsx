import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { useTenantData } from "../context/TenantDataContext";
import { convertToOpenAPI, specToJSON, specToYAML } from "../services/specConverter";
import { expandSimpleApi } from "../shared/simpleApiFormat";
import { validateApiSpec } from "../shared/validateApiSpec";
import type { ApiSpec } from "../types/tenant";
import type { APIDefinition } from "../types";

const OAUTH_SCOPE = "GtmsApi";

const METHOD_BADGE_COLOR: Record<string, string> = {
  GET: "bg-green-100 text-green-800",
  POST: "bg-blue-100 text-blue-800",
  PUT: "bg-amber-100 text-amber-800",
  PATCH: "bg-amber-100 text-amber-800",
  DELETE: "bg-red-100 text-red-800",
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "api";
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function requestClientCredentialsToken(tokenUrl: string, clientId: string, clientSecret: string, scope: string) {
  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("scope", scope);

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    // non-JSON response body
  }

  if (!res.ok) {
    const msg = data?.error_description || data?.error || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  if (!data?.access_token) {
    throw new Error("Token endpoint responded successfully but returned no access_token.");
  }
  return data as { access_token: string; expires_in?: number; token_type?: string };
}

type AuthMode = "bearer" | "oauth2";

function AuthorizePanel({
  authMode,
  setAuthMode,
  bearerInput,
  setBearerInput,
  appliedBearerToken,
  onApplyBearer,
  onClearBearer,
  tokenUrl,
  setTokenUrl,
  clientId,
  setClientId,
  clientSecret,
  setClientSecret,
  oauthStatus,
  oauthError,
  oauthToken,
  onRequestToken,
  onClearOAuth,
  onClose,
}: {
  authMode: AuthMode;
  setAuthMode: (m: AuthMode) => void;
  bearerInput: string;
  setBearerInput: (v: string) => void;
  appliedBearerToken: string;
  onApplyBearer: () => void;
  onClearBearer: () => void;
  tokenUrl: string;
  setTokenUrl: (v: string) => void;
  clientId: string;
  setClientId: (v: string) => void;
  clientSecret: string;
  setClientSecret: (v: string) => void;
  oauthStatus: "idle" | "loading" | "success" | "error";
  oauthError: string | null;
  oauthToken: string | null;
  onRequestToken: () => void;
  onClearOAuth: () => void;
  onClose: () => void;
}) {
  const bearerApplied = appliedBearerToken.length > 0 && appliedBearerToken === bearerInput.trim();

  return (
    <div className="absolute right-6 md:right-10 lg:right-16 top-full mt-2 w-[360px] bg-white text-[#3b4151] rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Authorize</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
      </div>

      <div className="px-4 pt-3 flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="auth-mode"
            checked={authMode === "bearer"}
            onChange={() => setAuthMode("bearer")}
          />
          Bearer Token
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="auth-mode"
            checked={authMode === "oauth2"}
            onChange={() => setAuthMode("oauth2")}
          />
          OAuth2 Client Credentials
        </label>
      </div>

      <div className="p-4">
        {authMode === "bearer" ? (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bearer Token</label>
            <input
              type="text"
              value={bearerInput}
              onChange={(e) => setBearerInput(e.target.value)}
              placeholder="Paste access token"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={onApplyBearer}
                disabled={!bearerInput.trim()}
                className="px-3 py-1.5 rounded bg-[#49cc90] text-white text-xs font-semibold hover:bg-[#3fb87f] disabled:opacity-50"
              >
                Apply
              </button>
              {appliedBearerToken && (
                <button onClick={onClearBearer} className="px-3 py-1.5 rounded border border-gray-300 text-gray-600 text-xs font-semibold hover:bg-gray-50">
                  Clear
                </button>
              )}
              {bearerApplied && <span className="text-xs text-[#49cc90] font-medium">✓ Applied</span>}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Token URL</label>
              <input
                type="text"
                value={tokenUrl}
                onChange={(e) => setTokenUrl(e.target.value)}
                placeholder="https://auth.example.com/oauth2/token"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Client Id</label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Client Id"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Client Secret</label>
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Client Secret"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Scope</label>
              <div className="text-sm font-mono bg-gray-100 text-gray-600 rounded px-2 py-1.5">{OAUTH_SCOPE}</div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={onRequestToken}
                disabled={!tokenUrl.trim() || !clientId.trim() || !clientSecret.trim() || oauthStatus === "loading"}
                className="px-3 py-1.5 rounded bg-[#49cc90] text-white text-xs font-semibold hover:bg-[#3fb87f] disabled:opacity-50"
              >
                {oauthStatus === "loading" ? "Requesting..." : "Get Token"}
              </button>
              {oauthToken && (
                <button onClick={onClearOAuth} className="px-3 py-1.5 rounded border border-gray-300 text-gray-600 text-xs font-semibold hover:bg-gray-50">
                  Clear
                </button>
              )}
            </div>

            {oauthStatus === "success" && oauthToken && (
              <p className="text-xs text-[#49cc90] font-medium">✓ Token acquired</p>
            )}
            {oauthStatus === "error" && oauthError && (
              <p className="text-xs text-[#f93e3e]">{oauthError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApiDetailPage() {
  const { tenantId, apiId } = useParams();
  const navigate = useNavigate();
  const { getTenant } = useTenantData();
  const tenant = getTenant(tenantId!);

  // The API is no longer embedded in the tenant blob — fetch it directly
  // from its own file under <tenant_id>/API/<apiId>.json.
  const [api, setApi] = useState<ApiSpec | null | undefined>(undefined);
  useEffect(() => {
    if (!tenantId || !apiId) return;
    setApi(undefined);
    fetch(`/api/tenants/${tenantId}/apis/${apiId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setApi(data))
      .catch(() => setApi(null));
  }, [tenantId, apiId]);

  // --- custom authorize state (replaces Swagger UI's built-in Authorize dialog) ---
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("bearer");

  const [bearerInput, setBearerInput] = useState("");
  const [appliedBearerToken, setAppliedBearerToken] = useState("");

  const [tokenUrl, setTokenUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [oauthToken, setOauthToken] = useState<string | null>(null);
  const [oauthStatus, setOauthStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [oauthError, setOauthError] = useState<string | null>(null);

  const effectiveToken = authMode === "bearer" ? appliedBearerToken : oauthToken ?? "";
  const isAuthorized = effectiveToken.length > 0;

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleApplyBearer = () => setAppliedBearerToken(bearerInput.trim());
  const handleClearBearer = () => {
    setBearerInput("");
    setAppliedBearerToken("");
  };

  const handleRequestToken = async () => {
    setOauthStatus("loading");
    setOauthError(null);
    try {
      const data = await requestClientCredentialsToken(tokenUrl.trim(), clientId.trim(), clientSecret, OAUTH_SCOPE);
      setOauthToken(data.access_token);
      setOauthStatus("success");
    } catch (err: any) {
      setOauthToken(null);
      setOauthStatus("error");
      setOauthError(err.message ?? "Failed to obtain token.");
    }
  };
  const handleClearOAuth = () => {
    setOauthToken(null);
    setOauthStatus("idle");
    setOauthError(null);
  };

  // Build a genuine OpenAPI 3.0 document from the tenant's minimal API
  // definition, and expose it through the real Swagger UI component so the
  // page renders/behaves like an actual OpenAPI documentation site
  // (try-it-out console, schemas, etc). We intentionally do NOT declare any
  // securitySchemes on the spec — that would make Swagger UI render its own
  // native "Authorize" lock/dialog alongside our custom Authorize panel.
  // Auth is handled entirely by our own panel + requestInterceptor below.
  // Two conversions happen here, both at render time, since the file on
  // disk is now stored exactly as submitted (no server-side expansion):
  //   1. expandSimpleApi   — simplified/ABAP-friendly fields (requestFields,
  //      a flat responses[] array, parameters without "in", etc.) into an
  //      OpenAPI-shaped endpoints array. A no-op for endpoints that already
  //      arrived fully OpenAPI-shaped.
  //   2. convertToOpenAPI  — that OpenAPI-shaped endpoints array into an
  //      actual OpenAPI 3.0 document (paths keyed by path+method, info,
  //      servers), which is what Swagger UI and the JSON/YAML export below
  //      both require.
  const spec = useMemo(() => {
    if (!api) return null;
    const expanded = expandSimpleApi(api);
    return convertToOpenAPI(expanded as unknown as APIDefinition);
  }, [api]);

  // Same validation apiService runs at registration time — repeated here so
  // an item that was written straight to disk (bypassing the API), or that
  // slips through for any other reason, still surfaces a clear warning
  // instead of Swagger UI silently rendering an incomplete page.
  const validation = useMemo(() => {
    if (!api) return null;
    return validateApiSpec(api);
  }, [api]);

  if (api === undefined) {
    return <p className="w-full px-6 md:px-10 lg:px-16 py-10 text-slate-600">Loading…</p>;
  }
  if (!tenant || !api || !spec) {
    return <p className="w-full px-6 md:px-10 lg:px-16 py-10 text-slate-600">API not found.</p>;
  }

  const fileBaseName = `${slugify(tenant.name)}-${slugify(api.name)}-openapi`;
  const methods = Array.from(new Set(api.endpoints.map((e) => e.method.toUpperCase())));

  const handleDownloadJSON = () => {
    downloadFile(specToJSON(spec as any), `${fileBaseName}.json`, "application/json");
    setExportOpen(false);
  };

  const handleDownloadYAML = () => {
    downloadFile(specToYAML(spec as any), `${fileBaseName}.yaml`, "application/yaml");
    setExportOpen(false);
  };

  return (
    <div className="min-h-screen bg-vistex-canvas">
      <div className="sticky top-12 z-40">
        <div className="bg-[#0f2847] text-[#9fb8d9] text-xs px-6 md:px-10 lg:px-16 py-2 flex items-center gap-2 overflow-x-auto">
          <button onClick={() => navigate("/")} className="hover:text-white whitespace-nowrap">Tenants</button>
          <span aria-hidden="true">›</span>
          <button onClick={() => navigate(`/tenants/${tenantId}/apis`)} className="hover:text-white whitespace-nowrap">{tenant.name}</button>
          <span aria-hidden="true">›</span>
          <span className="text-white font-medium whitespace-nowrap">{api.name}</span>
        </div>

        <div className="relative bg-gradient-to-r from-[#0f2847] via-[#1a3e6f] to-[#2a5298] text-white px-6 md:px-10 lg:px-16 py-5 shadow-md">
          <div className="w-full flex items-center justify-between flex-wrap gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-tight">
                  {api.name}
                </h1>
                <div className="flex items-center gap-1.5">
                  {methods.map((m) => (
                    <span
                      key={m}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${METHOD_BADGE_COLOR[m] ?? "bg-gray-100 text-gray-800"}`}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
              {api.baseUrl && (
                <p className="text-xs md:text-sm text-blue-100/80 mt-1 font-mono truncate">{api.baseUrl}</p>
              )}
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => setAuthOpen((o) => !o)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap border transition ${
                  isAuthorized
                    ? "border-[#49cc90] bg-[#49cc90]/10 text-[#49cc90] hover:bg-[#49cc90]/20"
                    : "border-white/30 bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {isAuthorized ? "🔒 Authorized" : "🔓 Authorize"}
              </button>

              <div className="relative" ref={exportRef}>
                <button
                  onClick={() => setExportOpen((o) => !o)}
                  className="px-4 py-2 bg-white text-[#1a3e6f] rounded-lg text-sm font-semibold hover:bg-blue-50 whitespace-nowrap transition flex items-center gap-1.5"
                >
                  Export
                  <span aria-hidden="true" className="text-xs">▾</span>
                </button>
                {exportOpen && (
                  <div className="absolute right-0 top-full mt-2 w-32 bg-white text-[#1a3e6f] rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
                    <button
                      onClick={handleDownloadJSON}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50"
                    >
                      JSON
                    </button>
                    <button
                      onClick={handleDownloadYAML}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 border-t border-gray-100"
                    >
                      YAML
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => navigate(`/tenants/${tenantId}/apis`)}
                className="px-4 py-2 bg-white/10 text-white border border-white/30 rounded-lg text-sm font-semibold hover:bg-white/20 whitespace-nowrap transition"
              >
                Back to APIs
              </button>
            </div>
          </div>

          {authOpen && (
          <AuthorizePanel
            authMode={authMode}
            setAuthMode={setAuthMode}
            bearerInput={bearerInput}
            setBearerInput={setBearerInput}
            appliedBearerToken={appliedBearerToken}
            onApplyBearer={handleApplyBearer}
            onClearBearer={handleClearBearer}
            tokenUrl={tokenUrl}
            setTokenUrl={setTokenUrl}
            clientId={clientId}
            setClientId={setClientId}
            clientSecret={clientSecret}
            setClientSecret={setClientSecret}
            oauthStatus={oauthStatus}
            oauthError={oauthError}
            oauthToken={oauthToken}
            onRequestToken={handleRequestToken}
            onClearOAuth={handleClearOAuth}
            onClose={() => setAuthOpen(false)}
          />
        )}
        </div>
      </div>

      <div className="w-full px-4 md:px-8 lg:px-12 py-6">
        {validation && !validation.valid && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <p className="text-sm font-semibold text-amber-800">
              This API doesn't produce a fully valid OpenAPI document
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Swagger UI below may render incorrectly or omit parts of the spec. Details:
            </p>
            <ul className="text-xs text-amber-700 mt-2 list-disc list-inside space-y-0.5">
              {validation.errors.slice(0, 5).map((err, i) => (
                <li key={i} className="font-mono">{err}</li>
              ))}
              {validation.errors.length > 5 && <li>+{validation.errors.length - 5} more</li>}
            </ul>
          </div>
        )}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <SwaggerUI
            key={effectiveToken || "anon"}
            spec={spec}
            docExpansion="list"
            defaultModelsExpandDepth={1}
            deepLinking
            requestInterceptor={(req: any) => {
              if (effectiveToken) {
                req.headers = { ...req.headers, Authorization: `Bearer ${effectiveToken}` };
              }
              return req;
            }}
          />
        </div>
      </div>
    </div>
  );
}