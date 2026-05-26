import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Products" },
  { to: "/cart", label: "Cart" },
  { to: "/orders", label: "Orders" }
];

const MobileBottomNav = () => (
  <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
    <div className="grid grid-cols-4 gap-2 px-3 pb-[calc(0.55rem+env(safe-area-inset-bottom))] pt-2">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === "/"}
          className={({ isActive }) =>
            `rounded-xl px-3 py-3 text-center text-sm font-semibold transition ${
              isActive ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  </nav>
);

export default MobileBottomNav;
