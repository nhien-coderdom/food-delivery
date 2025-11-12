import React, { useState } from "react";
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { AuthProvider, useAuth } from "./hooks/useAuth";

// Chỉ còn 1 link quản lý menu
const MENU_LINKS = [
  { label: "Thêm món mới" },
  { label: "Xóa món" },
  { label: "Cập nhật món" },
  { label: "Cập nhật trạng thái món" },
];

const ORDER_SECTIONS = [
  { label: "Chờ xác nhận", color: "#ef4444", count: 3 },
  { label: "Chờ làm món", color: "#f97316", count: 2 },
  { label: "Đang làm món", color: "#f59e0b", count: 1 },
  { label: "Chờ thanh toán", color: "#22c55e", count: 4 },
  { label: "Đã thanh toán, hoàn thành", color: "#10b981", count: 12 },
  { label: "Đã hủy", color: "#6b7280", count: 0 },
  { label: "Thống kê đơn hàng", color: "#0ea5e9", count: null },
];

const AppContent = () => {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.loadingText}>Đang kiểm tra phiên đăng nhập...</Text>
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        <Header username={user.username || user.email} onLogout={logout} />
        <View style={styles.body}>
          <Sidebar />
          <ContentPlaceholder />
        </View>
      </View>
    </SafeAreaView>
  );
};

// ---------------- LOGIN SCREEN ----------------
const LoginScreen = () => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!identifier || !password) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await login(identifier, password);
    } catch (err: any) {
      setError(err?.message ?? "Đăng nhập thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.loginSafeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />
      <View style={styles.loginContainer}>
        <Text style={styles.loginTitle}>Đăng nhập quản trị</Text>

        <TextInput
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="Email hoặc tên đăng nhập"
          placeholderTextColor="#aaa"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.loginInput}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Mật khẩu"
          placeholderTextColor="#aaa"
          secureTextEntry
          style={styles.loginInput}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.loginButton, submitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.loginButtonText}>
            {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.loginHint}>
          Liên hệ admin hệ thống nếu quên mật khẩu.
        </Text>
      </View>
    </SafeAreaView>
  );
};

// ---------------- HEADER ----------------
const Header = ({
  username,
  onLogout,
}: {
  username: string;
  onLogout: () => Promise<void>;
}) => {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>HỆ THỐNG QUẢN LÝ NHÀ HÀNG</Text>
      <View style={styles.headerActions}>
        <Text style={styles.greeting}>Xin chào</Text>
        <Text style={styles.username}>{username}</Text>
        <Pressable
          style={[styles.logoutBtn, loggingOut && styles.disabledButton]}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          <Text style={styles.logoutText}>
            {loggingOut ? "Đang thoát..." : "Đăng xuất"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

// ---------------- SIDEBAR ----------------
const Sidebar = () => {
  return (
    <ScrollView
      style={styles.sidebar}
      contentContainerStyle={styles.sidebarContent}
    >
      <View style={styles.block}>
        <Text style={styles.blockTitle}>Quản lý menu</Text>
        {MENU_LINKS.map((item) => (
          <Pressable
            key={item.label}
            style={({ pressed }) => [
              styles.navItem,
              pressed && { backgroundColor: "#fff3e5" },
            ]}
          >
            <Text style={styles.navItemText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.block}>
        <Text style={styles.blockTitle}>Thông tin đơn hàng</Text>
        {ORDER_SECTIONS.map((section) => (
          <Pressable
            key={section.label}
            style={({ pressed }) => [
              styles.navItem,
              pressed && { backgroundColor: "#fff3e5" },
            ]}
          >
            <View style={styles.navRow}>
              <Text style={styles.navItemText}>{section.label}</Text>
              {typeof section.count === "number" ? (
                <View style={[styles.badge, { backgroundColor: section.color }]}>
                  <Text style={styles.badgeText}>{section.count}</Text>
                </View>
              ) : (
                <View style={[styles.badge, { backgroundColor: section.color }]}>
                  <Text style={styles.badgeText}>i</Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
};

// ---------------- MAIN CONTENT ----------------
const ContentPlaceholder = () => (
  <View style={styles.content}>
    <View style={styles.contentCard}>
      <Text style={styles.contentTitle}>Chọn chức năng bên trái</Text>
      <Text style={styles.contentDesc}>
        Hệ thống quản lý giúp bạn theo dõi, cập nhật và thống kê đơn hàng một
        cách nhanh chóng.
      </Text>
    </View>
  </View>
);

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fafafa" },
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f97316",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f97316",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  headerActions: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  greeting: { fontSize: 14, color: "#374151" },
  username: { fontSize: 14, fontWeight: "700", color: "#059669" },
  logoutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#e0f2fe",
    borderWidth: 1,
    borderColor: "#38bdf8",
  },
  logoutText: { color: "#0284c7", fontSize: 14, fontWeight: "600" },

  body: { flex: 1, flexDirection: "row" },

  sidebar: {
    width: 100,
    backgroundColor: "#fff7ed",
    borderRightWidth: 1,
    borderRightColor: "#fed7aa",
  },
  sidebarContent: { padding: 16, gap: 20 },
  block: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fed7aa",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  blockTitle: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f97316",
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  navItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: "#fee2d5",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navItemText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  content: { flex: 1, padding: 24, backgroundColor: "#fff" },
  contentCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fffdf5",
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f97316",
    marginBottom: 8,
  },
  contentDesc: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff7ed",
  },
  loadingText: { marginTop: 12, color: "#f97316", fontSize: 14, fontWeight: "600" },

  loginSafeArea: {
    flex: 1,
    backgroundColor: "#0D0D0D",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loginContainer: {
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#2A2A2C",
    gap: 12,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  loginInput: {
    backgroundColor: "#2C2C2E",
    color: "#fff",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  errorText: { color: "#ef4444", fontSize: 14, textAlign: "center" },
  loginButton: {
    backgroundColor: "#f97316",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  loginButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  loginHint: { color: "#9ca3af", textAlign: "center", marginTop: 8, fontSize: 13 },
  disabledButton: { opacity: 0.6 },
});
