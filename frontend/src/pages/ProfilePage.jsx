import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AuthModal from "../components/AuthModal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import { useUserAuth } from "../context/UserAuthContext.jsx";

const ProfilePage = () => {
  const { user, isAuthenticated, updateProfile, updatePassword, refreshProfile } = useUserAuth();
  const { pushToast } = useToast();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [formState, setFormState] = useState({
    fullName: "",
    email: "",
    province: "",
    district: "",
    municipalityCity: "",
    wardNumber: "",
    streetTole: ""
  });
  const [passwordState, setPasswordState] = useState({
    currentPassword: "",
    newPassword: ""
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    setFormState({
      fullName: user.fullName || "",
      email: user.email || "",
      province: user.defaultAddress?.province || "",
      district: user.defaultAddress?.district || "",
      municipalityCity: user.defaultAddress?.municipalityCity || "",
      wardNumber: user.defaultAddress?.wardNumber || "",
      streetTole: user.defaultAddress?.streetTole || ""
    });
  }, [user]);

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setIsSavingProfile(true);
    try {
      const response = await updateProfile(formState);
      pushToast({
        type: "success",
        message: response.message || "Profile updated successfully."
      });
      await refreshProfile();
    } catch (error) {
      pushToast({
        type: "error",
        message: error.response?.data?.message || "Failed to update profile."
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async (event) => {
    event.preventDefault();
    setIsSavingPassword(true);
    try {
      const response = await updatePassword(passwordState);
      pushToast({
        type: "success",
        message: response.message || "Password updated successfully."
      });
      setPasswordState({ currentPassword: "", newPassword: "" });
    } catch (error) {
      pushToast({
        type: "error",
        message: error.response?.data?.message || "Failed to update password."
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <section className="space-y-4">
        <EmptyState
          title="Please login to view profile"
          description="Login or create an account to manage your address and password."
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

  return (
    <section className="space-y-4 pb-20">
      <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">My Account</p>
        <h1 className="mt-1 font-heading text-2xl font-semibold text-slate-900">Profile & Address</h1>
        <p className="mt-1 text-sm text-slate-600">
          Phone number is fixed for now: <span className="font-semibold text-slate-800">{user.phone}</span>
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <form onSubmit={handleSaveProfile} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <h2 className="font-heading text-lg font-semibold text-slate-900">Basic Information</h2>
          <div className="mt-3 space-y-3">
            <input
              required
              value={formState.fullName}
              onChange={(event) => setFormState((prev) => ({ ...prev, fullName: event.target.value }))}
              placeholder="Full Name"
              className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
            />
            <input
              value={formState.email}
              onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="Email (Optional)"
              className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
            />
            <input
              required
              value={formState.province}
              onChange={(event) => setFormState((prev) => ({ ...prev, province: event.target.value }))}
              placeholder="Province"
              className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
            />
            <input
              required
              value={formState.district}
              onChange={(event) => setFormState((prev) => ({ ...prev, district: event.target.value }))}
              placeholder="District"
              className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
            />
            <input
              required
              value={formState.municipalityCity}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, municipalityCity: event.target.value }))
              }
              placeholder="Municipality / City"
              className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
            />
            <input
              required
              value={formState.wardNumber}
              onChange={(event) => setFormState((prev) => ({ ...prev, wardNumber: event.target.value }))}
              placeholder="Ward Number"
              className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
            />
            <textarea
              required
              rows={3}
              value={formState.streetTole}
              onChange={(event) => setFormState((prev) => ({ ...prev, streetTole: event.target.value }))}
              placeholder="Street / Tole"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-300 focus:ring"
            />
          </div>

          <button
            type="submit"
            disabled={isSavingProfile}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSavingProfile ? "Saving..." : "Save Profile"}
          </button>
        </form>

        <aside className="space-y-4">
          <form onSubmit={handleSavePassword} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
            <h2 className="font-heading text-lg font-semibold text-slate-900">Change Password</h2>
            <div className="mt-3 space-y-3">
              <input
                required
                type="password"
                value={passwordState.currentPassword}
                onChange={(event) =>
                  setPasswordState((prev) => ({ ...prev, currentPassword: event.target.value }))
                }
                placeholder="Current password"
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
              />
              <input
                required
                type="password"
                value={passwordState.newPassword}
                onChange={(event) => setPasswordState((prev) => ({ ...prev, newPassword: event.target.value }))}
                placeholder="New password"
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
              />
            </div>
            <button
              type="submit"
              disabled={isSavingPassword}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSavingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
            <h2 className="font-heading text-lg font-semibold text-slate-900">Quick Links</h2>
            <div className="mt-3 flex flex-col gap-2">
              <Link
                to="/orders"
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                My Orders
              </Link>
              <Link
                to="/cart"
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cart
              </Link>
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
};

export default ProfilePage;
