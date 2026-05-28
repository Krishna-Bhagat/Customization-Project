import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, matchPath, useLocation, useParams } from "react-router-dom";
import MobileBottomNav from "./components/MobileBottomNav.jsx";
import Navbar from "./components/Navbar.jsx";
import PageSkeleton from "./components/PageSkeleton.jsx";
import RouteScrollManager from "./components/RouteScrollManager.jsx";
import SiteFooter from "./components/SiteFooter.jsx";

const HomePage = lazy(() => import("./pages/HomePage.jsx"));
const ProductsPage = lazy(() => import("./pages/ProductsPage.jsx"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage.jsx"));
const CustomizerWorkspacePage = lazy(() => import("./pages/CustomizerWorkspacePage.jsx"));
const ReviewCheckoutPage = lazy(() => import("./pages/ReviewCheckoutPage.jsx"));
const CartPage = lazy(() => import("./pages/CartPage.jsx"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage.jsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"));
const MyOrdersPage = lazy(() => import("./pages/MyOrdersPage.jsx"));
const AdminRoutes = lazy(() => import("./admin/AdminRoutes.jsx"));

const LegacyCustomizeRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/product/${id}`} replace />;
};

const App = () => {
  const location = useLocation();
  const pathname = location.pathname;

  const isAdminRoute = Boolean(matchPath({ path: "/admin/*", end: false }, pathname));
  const isHomePage = pathname === "/";
  const isProductDetailPage = Boolean(matchPath({ path: "/product/:id/*", end: false }, pathname));
  const isWorkspacePage = Boolean(matchPath({ path: "/customize/:id/workspace/*", end: false }, pathname));
  const isReviewPage = Boolean(matchPath({ path: "/customize/:id/checkout/*", end: false }, pathname));
  const isProductFlowPage = isProductDetailPage || isWorkspacePage || isReviewPage;
  const isImmersiveFlowPage = isWorkspacePage || isReviewPage;

  // Keep the full marketing footer only on storefront marketing surfaces.
  const showFooter = !isAdminRoute && isHomePage;
  const showMobileBottomNav = !isAdminRoute && !isProductFlowPage;

  return (
    <div className={isAdminRoute ? "min-h-screen bg-slate-100" : "min-h-screen bg-slate-50"}>
      <RouteScrollManager />
      {!isAdminRoute && !isImmersiveFlowPage ? <Navbar /> : null}
      <main
        className={
          isAdminRoute
            ? "w-full"
            : isImmersiveFlowPage
            ? "w-full"
            : "mx-auto w-full max-w-7xl px-4 pb-28 pt-5 sm:px-6 lg:px-8"
        }
      >
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/admin/*" element={<AdminRoutes />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/customize/:id/workspace" element={<CustomizerWorkspacePage />} />
            <Route path="/customize/:id/checkout" element={<ReviewCheckoutPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/orders" element={<MyOrdersPage />} />
            <Route path="/customize/:id" element={<LegacyCustomizeRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      {showFooter ? <SiteFooter /> : null}
      {showMobileBottomNav ? <MobileBottomNav /> : null}
    </div>
  );
};

export default App;
