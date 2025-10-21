import { View, Text, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";

export default function Navigation() {
  return (
    <View style={styles.nav}>
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Link href="/" asChild>
            <Pressable>
              <Text style={styles.logoText}>Food Order App</Text>
            </Pressable>
          </Link>
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          <Link href="/" asChild>
            <Pressable>
              <Text style={styles.menuText}>Home</Text>
            </Pressable>
          </Link>

          <Link href="./login" asChild>
            <Pressable style={styles.loginButton}>
              <Text style={styles.loginText}>Log In</Text>
            </Pressable>
          </Link>

          <Link href="./register" asChild>
            <Pressable style={styles.signupButton}>
              <Text style={styles.signupText}>Sign Up</Text>
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
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  inner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoContainer: {
    flex: 1,
  },
  logoText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#6b7280", // text-gray-500
  },
  menu: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
  },
  menuText: {
    fontSize: 16,
    color: "#6b7280",
  },
  loginButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  loginText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  signupButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  signupText: {
    fontSize: 14,
    color: "white",
    fontWeight: "600",
  },
});
