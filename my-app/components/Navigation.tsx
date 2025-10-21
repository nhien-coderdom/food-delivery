import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  TouchableWithoutFeedback,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { useAuth } from "../app/context/AuthContext";

export default function Navigation() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const handleLogout = async () => {
    await logout();
    setDropdownVisible(false);
    router.push("/login");
  };

  return (
    <View style={styles.nav}>
      <View style={styles.inner}>
        {/* 🥗 Logo */}
        <View style={styles.logoContainer}>
          <Link href="/(tabs)" asChild>
            <Pressable>
              <Text style={styles.logoText}>Food Order App</Text>
            </Pressable>
          </Link>
        </View>

        {/* 🧭 Menu */}
        <View style={styles.menu}>
          <Link href="/(tabs)" asChild>
            <Pressable>
              <Text style={styles.menuText}>Home</Text>
            </Pressable>
          </Link>

          {!user ? (
            <>
              <Link href="/login" asChild>
                <Pressable style={styles.loginButton}>
                  <Text style={styles.loginText}>Log In</Text>
                </Pressable>
              </Link>

              <Link href="/register" asChild>
                <Pressable style={styles.signupButton}>
                  <Text style={styles.signupText}>Sign Up</Text>
                </Pressable>
              </Link>
            </>
          ) : (
            /* ✅ Nếu đã login → avatar + dropdown */
            <View style={styles.avatarContainer}>
              <Pressable onPress={() => setDropdownVisible(!dropdownVisible)}>
                <Image
                  source={{
                    uri:
                      user.avatar ||
                      "https://th.bing.com/th/id/R.0b418159b4540fdece9a68e844c88f35?rik=KrMnTlXwi7A7wg&riu=http%3a%2f%2fthanhcongfarm.com%2fwp-content%2fuploads%2f2022%2f05%2fanh-con-vit-cam-dao-31.jpg&ehk=ANYgsHSlYQsSUDVdGKrO%2f1X7tRDmMsAkXm41B2ZXzTg%3d&risl=&pid=ImgRaw&r=0",
                  }}
                  style={styles.avatar}
                />
              </Pressable>

              {dropdownVisible && (
                <>
                  {/* overlay: click ra ngoài tắt dropdown */}
                  <TouchableWithoutFeedback
                    onPress={() => setDropdownVisible(false)}
                  >
                    <View style={styles.overlay} />
                  </TouchableWithoutFeedback>

                  <View style={styles.dropdown}>
                    <Text style={styles.dropdownName}>{user.username}</Text>

                    <Pressable
                      onPress={() => {
                        setDropdownVisible(false);
                        router.push("/(tabs)");
                      }}
                      style={styles.dropdownItem}
                    >
                      <Text style={styles.dropdownText}>Profile</Text>
                    </Pressable>

                    <View style={styles.separator} />

                    <Pressable onPress={handleLogout} style={styles.dropdownItem}>
                      <Text style={[styles.dropdownText, { color: "#dc2626" }]}>
                        Log Out
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          )}
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
    zIndex: 20, // ✅ để dropdown luôn nổi
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
    color: "#6b7280",
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

  /* Avatar & Dropdown */
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
    width: 160,
    paddingVertical: 6,
    zIndex: 2,
  },
  dropdownName: {
    textAlign: "center",
    fontWeight: "600",
    color: "#111",
    marginBottom: 6,
  },
  dropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dropdownText: {
    fontSize: 14,
    color: "#374151",
  },
  separator: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 4,
  },
});
