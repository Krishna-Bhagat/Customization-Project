import { Link } from "react-router-dom";

const SiteFooter = () => (
  <footer className="mt-16 border-t border-slate-200 bg-white">
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="font-heading text-lg font-semibold text-slate-900">GiftCraft Studio</h3>
          <p className="mt-2 text-sm text-slate-600">
            Personalized gifts and fashion made with love for every special moment.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Quick Links</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>
              <Link to="/" className="hover:text-slate-900">
                Home
              </Link>
            </li>
            <li>
              <Link to="/products" className="hover:text-slate-900">
                Products
              </Link>
            </li>
            <li>
              <Link to="/products" className="hover:text-slate-900">
                Customize
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Contact</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>support@giftcraftstudio.com</li>
            <li>+91 90000 00000</li>
            <li>Mumbai, India</li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Social</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>
              <a href="#" className="hover:text-slate-900">
                Instagram
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-slate-900">
                Pinterest
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-slate-900">
                YouTube
              </a>
            </li>
          </ul>
        </div>
      </div>
      <p className="mt-8 text-xs text-slate-500">(c) {new Date().getFullYear()} GiftCraft Studio. All rights reserved.</p>
    </div>
  </footer>
);

export default SiteFooter;
