import { useEffect, useState } from "react";
import MainLayout from "./layouts/MainLayout";
import RestaurantInfo from "./pages/RestaurantInfo";
import MenuManagement from "./pages/MenuManagement";
import OrderManagement from "./pages/OrderManagement";
import Revenue from "./pages/Revenue";
import LoginPage from "./pages/Login";

// EXPORT TYPE PAGE RA NGOÀI FILE
export type Page = "home" | "info" | "menu" | "orders" | "revenue";

type AuthState = {
  user: any | null;
  token: string | null;
  loading: boolean;
};

const emptyAuth: AuthState = {
  user: null,
  token: null,
  loading: true,
};

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [auth, setAuth] = useState<AuthState>(emptyAuth);

  useEffect(() => {
    const storedToken = localStorage.getItem("restaurant_admin_token");
    const storedUser = localStorage.getItem("restaurant_admin_user");

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setAuth({ user: parsedUser, token: storedToken, loading: false });
        return;
      } catch (error) {
        console.warn("Không thể parse user từ localStorage", error);
      }
    }

    setAuth({ user: null, token: null, loading: false });
  }, []);

  const handleLoginSuccess = (user: any, jwt: string) => {
    setAuth({ user, token: jwt, loading: false });
  };

  const handleLogout = () => {
    localStorage.removeItem("restaurant_admin_token");
    localStorage.removeItem("restaurant_admin_user");
    setPage("home");
    setAuth({ user: null, token: null, loading: false });
  };

  const renderPage = () => {
    switch (page) {
      case "info":
        return <RestaurantInfo token={auth.token} user={auth.user} />;
      case "menu":
        return <MenuManagement token={auth.token} user={auth.user} />;
      case "orders":
        return <OrderManagement token={auth.token} user={auth.user} />;
      case "revenue":
        return <Revenue />;
      default:
        return null;
    }
  };

  if (auth.loading) {
    return null;
  }

  if (!auth.user) {
    return <LoginPage onSuccess={handleLoginSuccess} />;
  }

  return <MainLayout page={page} setPage={setPage} content={renderPage()} onLogout={handleLogout} user={auth.user} />;
}
