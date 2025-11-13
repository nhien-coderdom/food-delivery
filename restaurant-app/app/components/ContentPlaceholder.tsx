import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function ContentPlaceholder() {
  return (
    <View style={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Chọn chức năng bên trái</Text>
        <Text style={styles.desc}>
          Hệ thống quản lý giúp bạn theo dõi, cập nhật và thống kê đơn hàng một cách nhanh chóng.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 24, backgroundColor: "#fff" },
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fffdf5",
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 18, fontWeight: "700", color: "#f97316", marginBottom: 8 },
  desc: { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 20 },
});
