import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import MobileBottomNav from "./components/MobileBottomNav.jsx";
import Navbar from "./components/Navbar.jsx";
import PageSkeleton from "./components/PageSkeleton.jsx";
import SiteFooter from "./components/SiteFooter.jsx";

const HomePage = lazy(() => import("./pages/HomePage.jsx"));
const ProductsPage = lazy(() => import("./pages/ProductsPage.jsx"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage.jsx"));
const CustomizerWorkspacePage = lazy(() => import("./pages/CustomizerWorkspacePage.jsx"));
const ReviewCheckoutPage = lazy(() => import("./pages/ReviewCheckoutPage.jsx"));

const LegacyCustomizeRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/product/${id}`} replace />;
};

const App = () => {
  const location = useLocation();
  const isProductDetailPage = /^\/product\/[^/]+\/?$/.test(location.pathname);
  const isWorkspacePage = /^\/customize\/[^/]+\/workspace\/?$/.test(location.pathname);
  const isCheckoutPage = /^\/customize\/[^/]+\/checkout\/?$/.test(location.pathname);
  const isProductFlowPage = isProductDetailPage || isWorkspacePage || isCheckoutPage;
  const isImmersiveFlowPage = isWorkspacePage || isCheckoutPage;

  return (
    <div className="min-h-screen bg-slate-50">
      {!isImmersiveFlowPage ? <Navbar /> : null}
      <main
        className={
          isImmersiveFlowPage
            ? "w-full"
            : "mx-auto w-full max-w-7xl px-4 pb-28 pt-5 sm:px-6 lg:px-8"
        }
      >
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/customize/:id/workspace" element={<CustomizerWorkspacePage />} />
            <Route path="/customize/:id/checkout" element={<ReviewCheckoutPage />} />
            <Route path="/customize/:id" element={<LegacyCustomizeRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      {!isProductFlowPage ? <SiteFooter /> : null}
      {!isProductFlowPage ? <MobileBottomNav /> : null}
    </div>
  );
};

export default App;
