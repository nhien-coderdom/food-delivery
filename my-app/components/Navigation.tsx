import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  TouchableWithoutFeedback,
  Platform,
  StatusBar,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { shadows } from "@/lib/shadowStyles";

export default function Navigation() {
  const { isSignedIn, signOut } = useAuth();
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
    <View style={[styles.nav, { paddingTop: insets.top + 12 }]}>
      <View style={styles.inner}>
        {/* 🥗 Logo */}
        <View style={styles.logoContainer}>
          <Link href="/(tabs)" asChild>
            <Pressable>
              <Text style={styles.logoText}>Food Order App</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    width: "100%",
    paddingBottom: 16,
    paddingHorizontal: 24,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#FFE5DC",
    zIndex: 20,
  },
  inner: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    flex: 1,
    justifyContent: "center",
  },
  logoText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FF6B35",
    letterSpacing: 0.5,
  },
  menu: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
  },
  menuText: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  loginButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF6B35",
  },
  loginText: {
    fontSize: 14,
    color: "#FF6B35",
    fontWeight: "600",
  },
  signupButton: {
    backgroundColor: "#FF6B35",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  signupText: {
    fontSize: 14,
    color: "white",
    fontWeight: "600",
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#FF6B35",
  },
  overlay: {
    position: "absolute",
    top: -100,
    left: -2000,
    right: -2000,
    bottom: -2000,
    backgroundColor: "transparent",
    zIndex: 1,
  },
  dropdown: {
    position: "absolute",
    top: 44,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    ...shadows.button,
    width: 160,
    paddingVertical: 6,
    zIndex: 2,
  },
  dropdownName: {
    textAlign: "center",
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  dropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dropdownText: {
    fontSize: 14,
    color: "#1F2937",
  },
  separator: {
    height: 1,
    backgroundColor: "#FFE5DC",
    marginVertical: 4,
  },
});