import { useEffect, useMemo, useState } from "react";
import AuthModal from "../components/AuthModal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import { fetchMyOrders } from "../api/index.js";
import { useUserAuth } from "../context/UserAuthContext.jsx";

const STATUS_FLOW = ["pending", "confirmed", "dispatched", "delivered"];

const formatDateTime = (value) =>
  new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

const StatusTracker = ({ status }) => {
  const currentIndex = STATUS_FLOW.indexOf(String(status || "").toLowerCase());

  return (
    <div className="mt-3 grid grid-cols-4 gap-2">
      {STATUS_FLOW.map((step, index) => {
        const isActive = index <= currentIndex;
        return (
          <div key={step} className="space-y-1">
            <div className={`h-1.5 rounded-full ${isActive ? "bg-brand-600" : "bg-slate-200"}`} />
            <p className={`text-[11px] font-semibold uppercase ${isActive ? "text-brand-700" : "text-slate-500"}`}>
              {step}
            </p>
          </div>
        );
      })}
    </div>
  );
};

const MyOrdersPage = () => {
  const { token, isAuthenticated } = useUserAuth();
  const { pushToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const loadOrders = async ({ silent = false } = {}) => {
    if (!isAuthenticated || !token) {
      setIsLoading(false);
      return;
    }

    if (!silent) {
      setIsLoading(true);
    }

    try {
      const response = await fetchMyOrders(token);
      setOrders(response.orders || []);
    } catch (error) {
      pushToast({
        type: "error",
        message: error.response?.data?.message || "Unable to load orders."
      });
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      loadOrders({ silent: true });
    }, 15000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  const hasOrders = useMemo(() => orders.length > 0, [orders]);

  if (!isAuthenticated) {
    return (
      <section className="space-y-4">
        <EmptyState
          title="Please login to view orders"
          description="Track your order progress from pending to delivered."
          action={
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Login / Sign Up
            </button>
          }
        />
        <AuthModal open={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="h-6 w-36 animate-pulse rounded bg-slate-200" />
        <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
      </section>
    );
  }

  if (!hasOrders) {
    return (
      <EmptyState
        title="No orders yet"
        description="Your placed orders will appear here with live status updates."
      />
    );
  }

  return (
    <section className="space-y-4 pb-20">
      <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">My Orders</p>
        <h1 className="mt-1 font-heading text-2xl font-semibold text-slate-900">Track Your Orders</h1>
      </header>

      <div className="space-y-3">
        {orders.map((order) => (
          <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Order Number</p>
                <h3 className="font-heading text-lg font-semibold text-slate-900">{order.orderNumber}</h3>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Order Date</p>
                <p className="text-sm font-semibold text-slate-800">{formatDateTime(order.createdAt)}</p>
              </div>
            </div>

            <p className="mt-2 text-sm text-slate-600">
              Items: {(order.items || []).map((item) => item.productName).join(", ") || "N/A"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Total Amount: <span className="font-semibold text-slate-900">NPR {Number(order.totalAmount).toFixed(2)}</span>
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Status:{" "}
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold uppercase text-brand-700">
                {order.status}
              </span>
            </p>

            <StatusTracker status={order.status} />
          </article>
        ))}
      </div>
    </section>
  );
};

export default MyOrdersPage;
