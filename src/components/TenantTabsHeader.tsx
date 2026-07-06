import { NavLink, useNavigate, useParams } from "react-router-dom";
import { useTenantData } from "../context/TenantDataContext";

// Each tab carries its own category color, applied only when active, so the
// color itself signals which kind of content you're browsing — consistent
// with the same blue/violet/amber used on the card accents in each list.
const TABS = [
  { key: "apis", label: "APIs", suffix: "/apis", active: "bg-[#1D4ED8] text-white" },
  { key: "events", label: "Events", suffix: "/events", active: "bg-[#7C3AED] text-white" },
  { key: "file-templates", label: "File Templates", suffix: "/file-templates", active: "bg-[#B45309] text-white" },
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
      <button
        onClick={() => navigate("/")}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-700 transition-colors mb-4"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M19 12H5M5 12L11 6M5 12L11 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Tenants
      </button>
      <h1 className="text-slate-900">{tenant?.name ?? tenantId}</h1>
      {tenant?.description && <p className="text-slate-600 mt-1">{tenant.description}</p>}

      <nav className="flex justify-center gap-2 mt-6 border-b border-slate-200 pb-3">
        {TABS.map((tab) => (
          <NavLink
            key={tab.key}
            to={`/tenants/${tenantId}${tab.suffix}`}
            className={({ isActive }) =>
              `px-5 py-2 rounded-lg whitespace-nowrap text-base font-semibold transition-colors ${
                isActive ? tab.active : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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