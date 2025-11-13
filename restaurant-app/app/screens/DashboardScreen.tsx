import React, { useState } from "react";
import { View, StyleSheet, Pressable, Text, ActivityIndicator } from "react-native";
import { useAuth } from "../../hooks/useAuth";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import InfoScreen from "../screens/InfoScreen";
import MenuScreen from "../screens/MenuScreen";
import OrderScreen from "../screens/OrderScreen";
import RevenueScreen from "../screens/RevenueScreen";
import ContentPlaceholder from "../components/ContentPlaceholder";

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [selectedScreen, setSelectedScreen] = useState<string>(""); // Mặc định trống

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  // Render phần nội dung bên phải
  const renderContent = () => {
    switch (selectedScreen) {
      case "info":
        return <InfoScreen />;
      case "menu":
        return <MenuScreen />;
      case "orders":
        return <OrderScreen />;
      case "revenue":
        return <RevenueScreen />;
      default:
        return <ContentPlaceholder />; // Mặc định hiển thị khung chọn
    }
  };

  return (
    <View style={styles.container}>
      <Header username={user?.username || user?.email || "Admin"} />
      <View style={styles.body}>
        {/* Sidebar */}
        <View style={styles.sidebarColumn}>
          <View style={styles.sidebarWrapper}>
            <Sidebar selected={selectedScreen} onSelect={setSelectedScreen} />
          </View>

          {/* Nút đăng xuất */}
          <View style={styles.logoutWrapper}>
            <Pressable
              style={({ pressed }) => [
                styles.logoutBtn,
                pressed && styles.logoutBtnPressed,
                loggingOut && styles.disabled,
              ]}
              onPress={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <ActivityIndicator color="#ef4444" />
              ) : (
                <Text style={styles.logoutText}>Đăng xuất</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Nội dung bên phải */}
        <View style={styles.contentContainer}>{renderContent()}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  body: { flex: 1, flexDirection: "row" },
  sidebarColumn: {
    width: 250,
    backgroundColor: "#fff7ed",
    borderRightWidth: 1,
    borderRightColor: "#fed7aa",
  },
  sidebarWrapper: { flex: 1 },
  logoutWrapper: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#fed7aa",
    backgroundColor: "#fff7ed",
  },
  logoutBtn: {
    backgroundColor: "#fee2e2",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  logoutBtnPressed: { backgroundColor: "#fecaca" },
  logoutText: { color: "#dc2626", fontWeight: "700", fontSize: 14 },
  disabled: { opacity: 0.7 },
  contentContainer: { flex: 1 },
});
