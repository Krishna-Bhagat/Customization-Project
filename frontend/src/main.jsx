import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AdminAuthProvider } from "./admin/context/AdminAuthContext.jsx";
import App from "./App.jsx";
import { ToastProvider } from "./components/ToastProvider.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { UserAuthProvider } from "./context/UserAuthContext.jsx";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AdminAuthProvider>
      <UserAuthProvider>
        <CartProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </CartProvider>
      </UserAuthProvider>
    </AdminAuthProvider>
  </BrowserRouter>
);
