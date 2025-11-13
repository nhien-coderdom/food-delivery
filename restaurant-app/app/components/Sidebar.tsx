// components/Sidebar.tsx
import React from "react";
import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";

export default function Sidebar({ selected, onSelect }: { selected: string; onSelect: (name: string) => void }) {
  const MENU_ITEMS = [
    { label: "Thông tin nhà hàng", key: "info" },
    { label: "Quản lý menu", key: "menu" },
    { label: "Quản lý đơn hàng", key: "orders" },
    { label: "Doanh thu", key: "revenue" },
  ];

  return (
    <ScrollView style={styles.sidebar} contentContainerStyle={styles.sidebarContent}>
      {MENU_ITEMS.map((item) => (
        <Pressable
          key={item.key}
          style={[
            styles.block,
            selected === item.key && styles.activeBlock
          ]}
          onPress={() => onSelect(item.key)}
        >
          <Text style={styles.blockTitle}>{item.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    flex: 1,
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
    alignSelf: "center",
    width: "90%",
  },
  activeBlock: {
    backgroundColor: "#f97316",
  },
  blockTitle: {
    textAlign: "center",
    color: "#374151",
    fontWeight: "700",
    paddingVertical: 10,
    fontSize: 15,
  },
});
