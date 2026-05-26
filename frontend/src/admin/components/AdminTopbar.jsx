import { SIDEBAR_SECTIONS } from "../constants/productMeta.js";

const AdminTopbar = ({ activeSection, onSelectSection, onLogout }) => {
  const activeLabel = SIDEBAR_SECTIONS.find((section) => section.key === activeSection)?.label || "Dashboard";

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Admin Dashboard</p>
          <h2 className="font-heading text-xl font-semibold text-slate-900">{activeLabel}</h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:flex">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-500 text-xs font-semibold text-white">
              AD
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Admin</p>
              <p className="text-xs text-slate-500">Manager</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto lg:hidden">
        {SIDEBAR_SECTIONS.map((section) => (
          <button
            key={section.key}
            type="button"
            onClick={() => onSelectSection(section.key)}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeSection === section.key
                ? "bg-teal-600 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>
    </header>
  );
};

export default AdminTopbar;
