import { Link, NavLink } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useUserAuth } from "../context/UserAuthContext.jsx";

const navClass = ({ isActive }) =>
  `rounded-xl px-3 py-2 text-sm font-semibold transition ${
    isActive ? "bg-brand-100 text-brand-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

const Navbar = () => {
  const { itemCount } = useCart();
  const { isAuthenticated, logout } = useUserAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="font-heading text-lg font-semibold text-slate-900">
          GiftCraft Studio
        </Link>
        <div className="hidden items-center gap-2 md:flex">
          <NavLink to="/" className={navClass} end>
            Home
          </NavLink>
          <NavLink to="/products" className={navClass}>
            Products
          </NavLink>
          <NavLink to="/cart" className={navClass}>
            Cart {itemCount > 0 ? `(${itemCount})` : ""}
          </NavLink>
          <NavLink to="/orders" className={navClass}>
            My Orders
          </NavLink>
          <NavLink to="/profile" className={navClass}>
            Profile
          </NavLink>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Logout
            </button>
          ) : null}
          <Link
            to="/products"
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Customize Now
          </Link>
        </div>
        <Link
          to="/cart"
          className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 md:hidden"
        >
          Cart {itemCount > 0 ? `(${itemCount})` : ""}
        </Link>
      </nav>
    </header>
  );
};

export default Navbar;
