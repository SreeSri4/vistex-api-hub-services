import { NavLink, useNavigate, useParams } from "react-router-dom";
import { useTenantData } from "../context/TenantDataContext";

const TABS = [
  { key: "apis", label: "APIs", suffix: "/apis" },
  { key: "events", label: "Events", suffix: "/events" },
  { key: "file-templates", label: "File Templates", suffix: "/file-templates" },
];

/**
 * Shared header for all tenant sub-pages: back link, tenant name/description,
 * and a centered, pill-styled tab bar (APIs / Events / File Templates) for
 * navigating between them.
 */
export function TenantTabsHeader() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const { getTenant } = useTenantData();
  const tenant = getTenant(tenantId!);

  return (
    <div>
      <button onClick={() => navigate("/")} className="text-sm text-blue-600 mb-4">
        ← Back to Tenants
      </button>
      <h1 className="text-2xl font-semibold text-slate-900">{tenant?.name ?? tenantId}</h1>
      {tenant?.description && <p className="text-slate-600 mt-1">{tenant.description}</p>}

      <nav className="flex justify-center gap-2 mt-6 border-b border-gray-200 pb-3">
        {TABS.map((tab) => (
          <NavLink
            key={tab.key}
            to={`/tenants/${tenantId}${tab.suffix}`}
            className={({ isActive }) =>
              `px-5 py-2 rounded-lg whitespace-nowrap text-base font-semibold transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}