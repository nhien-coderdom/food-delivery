import { ClerkProvider, useUser } from "@clerk/clerk-expo";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "../app/context/AuthContext";
import SyncClerkUser from "../components/SyncClerkUser";
import { CartProvider } from "./context/CartContext";
import { AddressProvider } from "./context/AddressContext";

// 🧩 Tắt một số warning không quan trọng khi dev
if (__DEV__) {
  const originalWarn = console.warn;
  const originalLog = console.log;

  console.warn = (...args) => {
    const message = typeof args[0] === "string" ? args[0] : "";
    if (
      message.includes("Clerk: Clerk has been loaded with development keys") ||
      message.includes("props.pointerEvents is deprecated") ||
      message.includes("Cannot record touch end without a touch start")
    ) {
      return;
    }
    originalWarn(...args);
  };

  console.log = (...args) => {
    const message = typeof args[0] === "string" ? args[0] : "";
    if (message.includes("[Intervention] Slow network is detected")) return;
    originalLog(...args);
  };
}

// 🔑 Lưu session token Clerk trong SecureStore
const tokenCache = {
  getToken: (key: string) => SecureStore.getItemAsync(key),
  saveToken: (key: string, value: string) =>
    SecureStore.setItemAsync(key, value),
};

// 🧭 Component bảo vệ route — chuyển hướng login/home
function AuthGate() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isLoaded) return; // chờ Clerk load xong
    const inAuthGroup = segments[0] === "auth";

    if (isSignedIn && inAuthGroup) {
      router.replace("/(tabs)");
    } else if (!isSignedIn && !inAuthGroup) {
      router.replace("/auth/login");
    }
  }, [isLoaded, isSignedIn]);

  return <Slot />;
}

// ✅ Root Layout hoàn chỉnh
export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <SafeAreaProvider>
        {/* 🔒 AuthProvider phải bọc quanh SyncClerkUser */}
        <AuthProvider>
          <AddressProvider>
            <CartProvider>
              {/* 🔄 Đồng bộ Clerk → Strapi → AuthContext */}
              <SyncClerkUser />

              {/* 🧭 Xử lý chuyển hướng login/home */}
              <AuthGate />
            </CartProvider>
          </AddressProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
