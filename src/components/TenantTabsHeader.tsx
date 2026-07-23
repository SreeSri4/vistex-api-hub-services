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
      <div className="bg-gradient-to-r from-[#0f2847] via-[#1a3e6f] to-[#2a5298] text-white px-6 md:px-10 lg:px-16 py-5 shadow-md -mx-6 md:-mx-10 lg:-mx-16">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-tight">
              {tenant?.name ?? tenantId}
            </h1>
            {tenant?.description && (
              <p className="text-sm text-blue-100/80 mt-1">{tenant.description}</p>
            )}
          </div>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-white/10 text-white border border-white/30 rounded-lg text-sm font-semibold hover:bg-white/20 whitespace-nowrap transition"
          >
            ← Back to Tenants
          </button>
        </div>
      </div>

      <nav className="flex justify-center gap-2 mt-4 border-b border-slate-200 pb-3">
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