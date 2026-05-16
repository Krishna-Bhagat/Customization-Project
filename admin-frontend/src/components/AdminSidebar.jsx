import { SIDEBAR_SECTIONS } from "../constants/productMeta.js";

const AdminSidebar = ({ activeSection, onSelectSection }) => (
  <aside className="hidden w-72 shrink-0 border-r border-slate-800/80 bg-slate-950 p-6 text-slate-200 lg:flex lg:flex-col">
    <div className="mb-8">
      <p className="text-xs uppercase tracking-[0.2em] text-teal-300">Admin Portal</p>
      <h1 className="mt-2 font-heading text-2xl font-semibold text-white">Print Commerce</h1>
    </div>

    <nav className="space-y-2">
      {SIDEBAR_SECTIONS.map((section) => (
        <button
          key={section.key}
          type="button"
          onClick={() => onSelectSection(section.key)}
          className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
            activeSection === section.key
              ? "bg-teal-500/20 text-teal-200 shadow-[0_0_0_1px_rgba(45,212,191,0.25)]"
              : "text-slate-300 hover:bg-slate-900 hover:text-white"
          }`}
        >
          {section.label}
        </button>
      ))}
    </nav>

    <div className="mt-auto rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/10 p-4 text-xs text-slate-200">
      Manage products, categories, and sizes from one place.
    </div>
  </aside>
);

export default AdminSidebar;
