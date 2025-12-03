import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Navigation() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    try {
      await signOut();
      setDropdownVisible(false);
      router.replace("/auth/login");
    } catch (error) {
      console.error("❌ Logout failed:", error);
    }
  };

  return (
    <View style={[styles.nav, { paddingTop: insets.top + 10 }]}>
      <View style={styles.inner}>
        {/* LOGO CENTER */}
        <Link href="/(tabs)" asChild>
          <Pressable>
            <Image
              source={require("../assets/images/logoFoodei.png")}
              style={styles.logoImage}
            />
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    width: "100%",
    backgroundColor: "#fff",
    paddingBottom: 12,
    paddingHorizontal: 20,
    zIndex: 20,
  },
  inner: {
    flexDirection: "row",
    justifyContent: "center",   
    alignItems: "center",
  },
  logoImage: {
    width: 200,                
    height: 60,
    resizeMode: "contain",
  },
});
