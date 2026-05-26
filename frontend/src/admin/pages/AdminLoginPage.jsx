import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { adminLogin } from "../api/index.js";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setToken, isAuthenticated } = useAdminAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = location.state?.from?.pathname || "/admin";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await adminLogin({ username, password });
      setToken(response.token);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/admin", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.25),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.15),transparent_50%)]" />
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white/90 p-7 shadow-soft backdrop-blur">
        <p className="text-xs uppercase tracking-[0.2em] text-teal-600">Print Commerce</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-slate-900">Admin Login</h1>
        <p className="mt-2 text-sm text-slate-600">Manage products, categories, and size settings securely.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Username</span>
            <input
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-teal-300 focus:ring"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Password</span>
            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-teal-300 focus:ring"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-teal-300"
          >
            {isSubmitting ? "Signing in..." : "Login"}
          </button>
        </form>

        {errorMessage ? <p className="mt-4 text-sm font-medium text-red-700">{errorMessage}</p> : null}
      </div>
    </section>
  );
};

export default AdminLoginPage;
