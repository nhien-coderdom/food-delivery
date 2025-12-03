import { ClerkProvider, useUser } from "@clerk/clerk-expo";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import * as Linking from "expo-linking";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "../app/context/AuthContext";
import SyncClerkUser from "../components/SyncClerkUser";
import { CartProvider } from "./context/CartContext";
import { AddressProvider } from "./context/AddressContext";

// 🧩 Tắt warning không cần thiết
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

// 🔑 SecureStore cho Clerk
const tokenCache = {
  getToken: (key: string) => SecureStore.getItemAsync(key),
  saveToken: (key: string, value: string) =>
    SecureStore.setItemAsync(key, value),
};

// 🧭 Route Guard
function AuthGate() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === "auth";

    if (isSignedIn && inAuthGroup) {
      router.replace("/(tabs)");
    } else if (!isSignedIn && !inAuthGroup) {
      router.replace("/auth/login");
    }
  }, [isLoaded, isSignedIn]);

  return <Slot />;
}

// =====================================================
// ✅ ROOT LAYOUT — nơi đặt Deep Link Listener
// =====================================================
export default function RootLayout() {
  const router = useRouter();

  // 📌 Listener nhận redirect từ VNPAY → quay về app
  useEffect(() => {
    const sub = Linking.addEventListener("url", (event) => {
      const url = event.url;
      console.log("DEEPLINK RETURNED:", url);

      const { queryParams, path } = Linking.parse(url);
      console.log("Parsed:", { path, queryParams });

      if (queryParams?.orderId) {
        // 🔥 Điều hướng tới trang success
        router.push(`/checkout/success?orderId=${queryParams.orderId}`);
      }
    });

    return () => sub.remove();
  }, []);

  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <SafeAreaProvider>
        <AuthProvider>
          <AddressProvider>
            <CartProvider>
              <SyncClerkUser />

              <AuthGate />
            </CartProvider>
          </AddressProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
