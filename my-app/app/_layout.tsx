import { ClerkProvider, useUser } from "@clerk/clerk-expo";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import SyncClerkUser from "../components/SyncClerkUser";

const tokenCache = {
  getToken: (key: string) => SecureStore.getItemAsync(key),
  saveToken: (key: string, value: string) => SecureStore.setItemAsync(key, value),
};

function AuthGate() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isLoaded) return; // Clerk chưa load xong thì chờ

    const inAuthGroup = segments[0] === "auth"; // ví dụ: /auth/login hoặc /auth/register

    if (isSignedIn && inAuthGroup) {
      // 🔹 Nếu user đã đăng nhập mà đang ở auth page => chuyển về home
      router.replace("/(tabs)");
    } else if (!isSignedIn && !inAuthGroup) {
      // 🔹 Nếu user chưa đăng nhập mà không ở auth => chuyển về login
      router.replace("/auth/login");
    }
  }, [isLoaded, isSignedIn, segments]);

  return <Slot />; // render các route con
}

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <SyncClerkUser />
      <AuthGate />
    </ClerkProvider>
  );
}
