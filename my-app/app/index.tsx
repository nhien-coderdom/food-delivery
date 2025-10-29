import React, { useEffect } from "react";
import { View, Image, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

export default function Index() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded) return; // Đợi Clerk load xong

    // Nếu đã đăng nhập => vào home
    if (isSignedIn) {
      router.replace("/(tabs)");
    } else {
      // Nếu chưa đăng nhập => hiện login
      router.replace("/auth/login");
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <View style={styles.container}>
      <Image 
        source={require("../assets/images/react-logo.png")} 
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  logo: { width: 160, height: 160 },
});
