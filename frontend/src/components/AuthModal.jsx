import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useUserAuth } from "../context/UserAuthContext.jsx";
import { useToast } from "./ToastProvider.jsx";

const initialSignupState = {
  fullName: "",
  phone: "",
  email: "",
  password: "",
  province: "",
  district: "",
  municipalityCity: "",
  wardNumber: "",
  streetTole: ""
};

const initialLoginState = {
  phone: "",
  password: ""
};

const initialForgotState = {
  phoneOrEmail: "",
  newPassword: ""
};

const isTenDigitPhone = (value) => /^\d{10}$/.test(String(value || "").trim());

const AuthModal = ({
  open,
  defaultMode = "login",
  title = "Continue to Checkout",
  subtitle = "Please login or create an account to continue.",
  onClose,
  onSuccess
}) => {
  const { login, register, forgotPassword } = useUserAuth();
  const { pushToast } = useToast();

  const [mode, setMode] = useState(defaultMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginState, setLoginState] = useState(initialLoginState);
  const [signupState, setSignupState] = useState(initialSignupState);
  const [forgotState, setForgotState] = useState(initialForgotState);
  const [errorMessage, setErrorMessage] = useState("");

  const headerText = useMemo(() => {
    if (mode === "signup") {
      return {
        title: "Create your account",
        subtitle: "Phone number is required. Email is optional."
      };
    }
    if (mode === "forgot") {
      return {
        title: "Reset password",
        subtitle: "Enter your phone number or email and set a new password."
      };
    }
    return {
      title,
      subtitle
    };
  }, [mode, subtitle, title]);

  const resetLocalState = () => {
    setMode(defaultMode);
    setErrorMessage("");
    setIsSubmitting(false);
    setLoginState(initialLoginState);
    setSignupState(initialSignupState);
    setForgotState(initialForgotState);
  };

  const handleClose = () => {
    resetLocalState();
    onClose?.();
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!isTenDigitPhone(loginState.phone)) {
      setErrorMessage("Phone number must be exactly 10 digits.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(loginState);
      pushToast({ type: "success", message: "Login successful." });
      onSuccess?.();
      handleClose();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!isTenDigitPhone(signupState.phone)) {
      setErrorMessage("Phone number must be exactly 10 digits.");
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        fullName: signupState.fullName,
        phone: signupState.phone,
        password: signupState.password,
        email: signupState.email,
        province: signupState.province,
        district: signupState.district,
        municipalityCity: signupState.municipalityCity,
        wardNumber: signupState.wardNumber,
        streetTole: signupState.streetTole
      });
      pushToast({ type: "success", message: "Account created successfully." });
      onSuccess?.();
      handleClose();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Signup failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgot = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const response = await forgotPassword(forgotState);
      pushToast({
        type: "success",
        message: response.message || "Password reset successful."
      });
      setMode("login");
      setForgotState(initialForgotState);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Unable to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[95] bg-slate-900/55 px-3 py-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.2 }}
            className="mx-auto flex h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <header className="border-b border-slate-200 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-xl font-semibold text-slate-900">{headerText.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{headerText.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-50"
                >
                  ×
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {mode === "login" ? (
                <form className="space-y-3" onSubmit={handleLogin}>
                  <input
                    required
                    value={loginState.phone}
                    onChange={(event) =>
                      setLoginState((prev) => ({ ...prev, phone: event.target.value.replace(/\D/g, "") }))
                    }
                    placeholder="Phone number (10 digits)"
                    className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
                  />
                  <input
                    required
                    type="password"
                    value={loginState.password}
                    onChange={(event) => setLoginState((prev) => ({ ...prev, password: event.target.value }))}
                    placeholder="Password"
                    className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
                  />

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isSubmitting ? "Signing in..." : "Login"}
                  </button>

                  <div className="flex items-center justify-between text-xs font-semibold">
                    <button type="button" className="text-brand-700" onClick={() => setMode("forgot")}>
                      Forgot password?
                    </button>
                    <button type="button" className="text-slate-600" onClick={() => setMode("signup")}>
                      Create account
                    </button>
                  </div>
                </form>
              ) : null}

              {mode === "signup" ? (
                <form className="space-y-3" onSubmit={handleSignup}>
                  <input
                    required
                    value={signupState.fullName}
                    onChange={(event) => setSignupState((prev) => ({ ...prev, fullName: event.target.value }))}
                    placeholder="Full Name"
                    className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
                  />
                  <input
                    required
                    value={signupState.phone}
                    onChange={(event) =>
                      setSignupState((prev) => ({ ...prev, phone: event.target.value.replace(/\D/g, "") }))
                    }
                    placeholder="Phone Number (10 digits)"
                    className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
                  />
                  <input
                    value={signupState.email}
                    onChange={(event) => setSignupState((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="Email (Optional)"
                    className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
                  />
                  <input
                    required
                    type="password"
                    value={signupState.password}
                    onChange={(event) => setSignupState((prev) => ({ ...prev, password: event.target.value }))}
                    placeholder="Password"
                    className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
                  />
                  <input
                    required
                    value={signupState.province}
                    onChange={(event) => setSignupState((prev) => ({ ...prev, province: event.target.value }))}
                    placeholder="Province"
                    className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
                  />
                  <input
                    required
                    value={signupState.district}
                    onChange={(event) => setSignupState((prev) => ({ ...prev, district: event.target.value }))}
                    placeholder="District"
                    className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
                  />
                  <input
                    required
                    value={signupState.municipalityCity}
                    onChange={(event) =>
                      setSignupState((prev) => ({ ...prev, municipalityCity: event.target.value }))
                    }
                    placeholder="Municipality / City"
                    className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
                  />
                  <input
                    required
                    value={signupState.wardNumber}
                    onChange={(event) => setSignupState((prev) => ({ ...prev, wardNumber: event.target.value }))}
                    placeholder="Ward Number"
                    className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
                  />
                  <textarea
                    required
                    rows={2}
                    value={signupState.streetTole}
                    onChange={(event) => setSignupState((prev) => ({ ...prev, streetTole: event.target.value }))}
                    placeholder="Street / Tole"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-300 focus:ring"
                  />

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isSubmitting ? "Creating..." : "Create Account"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Back to Login
                  </button>
                </form>
              ) : null}

              {mode === "forgot" ? (
                <form className="space-y-3" onSubmit={handleForgot}>
                  <input
                    required
                    value={forgotState.phoneOrEmail}
                    onChange={(event) => setForgotState((prev) => ({ ...prev, phoneOrEmail: event.target.value }))}
                    placeholder="Phone number or email"
                    className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
                  />
                  <input
                    required
                    type="password"
                    value={forgotState.newPassword}
                    onChange={(event) => setForgotState((prev) => ({ ...prev, newPassword: event.target.value }))}
                    placeholder="New password"
                    className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-brand-300 focus:ring"
                  />

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isSubmitting ? "Resetting..." : "Reset Password"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Back to Login
                  </button>
                </form>
              ) : null}

              {errorMessage ? (
                <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                  {errorMessage}
                </p>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default AuthModal;
