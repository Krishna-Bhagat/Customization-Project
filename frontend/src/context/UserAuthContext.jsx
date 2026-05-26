import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  fetchCurrentUser,
  forgotPassword as forgotPasswordApi,
  loginUser as loginUserApi,
  registerUser as registerUserApi,
  updateProfile as updateProfileApi,
  updateProfilePassword as updateProfilePasswordApi
} from "../api/index.js";

const USER_TOKEN_KEY = "giftcraft-user-token";

const UserAuthContext = createContext(null);

const readInitialToken = () => localStorage.getItem(USER_TOKEN_KEY) || "";

export const UserAuthProvider = ({ children }) => {
  const [token, setToken] = useState(readInitialToken);
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      if (!token) {
        if (isMounted) {
          setUser(null);
          setIsInitializing(false);
        }
        return;
      }

      try {
        const response = await fetchCurrentUser(token);
        if (isMounted) {
          setUser(response.user || null);
        }
      } catch {
        localStorage.removeItem(USER_TOKEN_KEY);
        if (isMounted) {
          setToken("");
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const persistAuth = (response) => {
    const nextToken = String(response?.token || "").trim();
    const nextUser = response?.user || null;

    if (!nextToken) {
      throw new Error("Authentication token missing.");
    }

    localStorage.setItem(USER_TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
    return response;
  };

  const register = async (payload) => {
    const response = await registerUserApi(payload);
    return persistAuth(response);
  };

  const login = async (payload) => {
    const response = await loginUserApi(payload);
    return persistAuth(response);
  };

  const forgotPassword = async (payload) => forgotPasswordApi(payload);

  const refreshProfile = async () => {
    if (!token) {
      return null;
    }
    const response = await fetchCurrentUser(token);
    setUser(response.user || null);
    return response.user || null;
  };

  const updateProfile = async (payload) => {
    if (!token) {
      throw new Error("Unauthorized");
    }
    const response = await updateProfileApi({ token, payload });
    setUser(response.user || null);
    return response;
  };

  const updatePassword = async (payload) => {
    if (!token) {
      throw new Error("Unauthorized");
    }
    return updateProfilePasswordApi({ token, payload });
  };

  const logout = () => {
    localStorage.removeItem(USER_TOKEN_KEY);
    setToken("");
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isInitializing,
      isAuthenticated: Boolean(token && user),
      register,
      login,
      forgotPassword,
      refreshProfile,
      updateProfile,
      updatePassword,
      logout
    }),
    [token, user, isInitializing]
  );

  return <UserAuthContext.Provider value={value}>{children}</UserAuthContext.Provider>;
};

export const useUserAuth = () => {
  const context = useContext(UserAuthContext);
  if (!context) {
    throw new Error("useUserAuth must be used within UserAuthProvider");
  }
  return context;
};
