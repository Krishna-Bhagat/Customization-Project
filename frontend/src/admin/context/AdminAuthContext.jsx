import { createContext, useContext, useMemo, useState } from "react";

const AdminAuthContext = createContext(null);

const TOKEN_KEY = "custom_tee_admin_token";

export const AdminAuthProvider = ({ children }) => {
  const [token, setTokenState] = useState(() => localStorage.getItem(TOKEN_KEY) || "");

  const setToken = (newToken) => {
    if (!newToken) {
      localStorage.removeItem(TOKEN_KEY);
      setTokenState("");
      return;
    }

    localStorage.setItem(TOKEN_KEY, newToken);
    setTokenState(newToken);
  };

  const value = useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      setToken,
      logout: () => setToken("")
    }),
    [token]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
};
