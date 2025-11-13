import React from "react";
import { View, StatusBar, StyleSheet, ActivityIndicator, Text } from "react-native";
import { useAuth } from "../hooks/useAuth";
import LoginScreen from "./screens/LoginScreen";
import DashboardScreen from "./screens/DashboardScreen";

export default function AppContent() {
  const { user, loading } = useAuth();

  // Loading state
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.loadingText}>
          Đang kiểm tra phiên đăng nhập...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {user ? <DashboardScreen /> : <LoginScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    width: "100%",              
    backgroundColor: "#fafafa",
  },
  centered: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff7ed",
  },
  loadingText: {
    marginTop: 12,
    color: "#f97316",
    fontSize: 14,
    fontWeight: "600",
  },
});
