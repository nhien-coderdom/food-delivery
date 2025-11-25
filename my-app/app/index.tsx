import React, { useEffect } from "react";
import { View, Image, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

export default function Index() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      // Đã đăng nhập → vào tab màn hình chính
      router.replace("/(tabs)");
    } else {
      // Chưa đăng nhập → vào login
      router.replace("/auth/login");
    }
  }, [isLoaded, isSignedIn]);

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
