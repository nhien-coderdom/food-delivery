import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface Order {
  id: number;
  customer: string;
  total: number;
  items: { name: string; qty: number }[];
  status: "new" | "delivering" | "done";
  address: string;
  time: string;
}

export default function OrderScreen() {
  const [statusTab, setStatusTab] = useState<"new" | "delivering" | "done">(
    "new"
  );
  const [orders, setOrders] = useState<Order[]>([
    {
      id: 1,
      customer: "Nguyễn Văn A",
      total: 95000,
      items: [
        { name: "Phở bò", qty: 1 },
        { name: "Trà đá", qty: 1 },
      ],
      status: "new",
      address: "123 Đường Láng, Hà Nội",
      time: "12:30 14/11/2025",
    },
    {
      id: 2,
      customer: "Lê Thị B",
      total: 135000,
      items: [
        { name: "Bún chả", qty: 2 },
        { name: "Nước suối", qty: 2 },
      ],
      status: "delivering",
      address: "456 Hai Bà Trưng, Hà Nội",
      time: "13:00 14/11/2025",
    },
    {
      id: 3,
      customer: "Trần Văn C",
      total: 60000,
      items: [{ name: "Cơm tấm", qty: 1 }],
      status: "done",
      address: "789 Cầu Giấy, Hà Nội",
      time: "11:00 14/11/2025",
    },
  ]);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalAnim] = useState(new Animated.Value(0));

  const filteredOrders = orders.filter((o) => o.status === statusTab);

  const handleUpdateStatus = (id: number, next: Order["status"]) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: next } : o))
    );
    closeModal();
  };

  const openModal = (order: Order) => {
    setSelectedOrder(order);
    Animated.timing(modalAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  };

  const closeModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
      easing: Easing.in(Easing.cubic),
    }).start(() => setSelectedOrder(null));
  };

  const statusColors = {
    new: "#f59e0b",
    delivering: "#10b981",
    done: "#6b7280",
  };

  const statusLabels = {
    new: "Mới",
    delivering: "Đang giao",
    done: "Hoàn thành",
  };

  const renderOrderCard = (order: Order) => (
    <Pressable
      style={[
        styles.orderCard,
        { borderLeftColor: statusColors[order.status] },
      ]}
      onPress={() => openModal(order)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.customer}>{order.customer}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[order.status] }]}>
          <MaterialIcons
            name={
              order.status === "new"
                ? "fiber-new"
                : order.status === "delivering"
                ? "local-shipping"
                : "check-circle"
            }
            size={16}
            color="#fff"
          />
          <Text style={styles.statusText}>{statusLabels[order.status]}</Text>
        </View>
      </View>
      <Text style={styles.items}>
        {order.items.map((i) => `${i.name} x${i.qty}`).join(", ")}
      </Text>
      <Text style={styles.total}>{order.total.toLocaleString()} đ</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📦 Quản lý đơn hàng</Text>

      {/* Tabs */}
      <View style={styles.tabs}>
        {[
          { key: "new", label: "Mới" },
          { key: "delivering", label: "Đang giao" },
          { key: "done", label: "Hoàn thành" },
        ].map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, statusTab === tab.key && styles.tabActive]}
            onPress={() => setStatusTab(tab.key as any)}
          >
            <Text
              style={[
                styles.tabText,
                statusTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Order list */}
      {filteredOrders.length > 0 ? (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => renderOrderCard(item)}
        />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Không có đơn hàng nào</Text>
        </View>
      )}

      {/* Modal chi tiết đơn */}
      {selectedOrder && (
        <Modal transparent animationType="none" visible={!!selectedOrder}>
          <Animated.View
            style={[
              styles.modalOverlay,
              {
                opacity: modalAnim,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [
                    {
                      translateY: modalAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <ScrollView>
                <Text style={styles.modalTitle}>Chi tiết đơn hàng</Text>
                <Text style={styles.modalLabel}>
                  Khách hàng: {selectedOrder.customer}
                </Text>
                <Text style={styles.modalLabel}>
                  Địa chỉ: {selectedOrder.address}
                </Text>
                <Text style={styles.modalLabel}>
                  Thời gian: {selectedOrder.time}
                </Text>
                <Text style={styles.modalLabel}>Món:</Text>
                {selectedOrder.items.map((i, idx) => (
                  <Text key={idx} style={styles.modalItem}>
                    - {i.name} x{i.qty}
                  </Text>
                ))}
                <Text style={[styles.modalLabel, { marginTop: 8 }]}>
                  Tổng: {selectedOrder.total.toLocaleString()} đ
                </Text>

                {/* Nút hành động */}
                <View style={styles.modalActions}>
                  {selectedOrder.status === "new" && (
                    <>
                      <Pressable
                        style={[styles.actionBtn, { backgroundColor: "#16a34a" }]}
                        onPress={() =>
                          handleUpdateStatus(selectedOrder.id, "delivering")
                        }
                      >
                        <Text style={styles.actionText}>Nhận đơn</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.actionBtn, { backgroundColor: "#dc2626" }]}
                        onPress={() =>
                          handleUpdateStatus(selectedOrder.id, "done")
                        }
                      >
                        <Text style={styles.actionText}>Hủy</Text>
                      </Pressable>
                    </>
                  )}
                  {selectedOrder.status === "delivering" && (
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: "#f97316" }]}
                      onPress={() =>
                        handleUpdateStatus(selectedOrder.id, "done")
                      }
                    >
                      <Text style={styles.actionText}>Hoàn tất</Text>
                    </Pressable>
                  )}
                </View>

                <Pressable
                  style={[
                    styles.actionBtn,
                    { backgroundColor: "#9ca3af", marginTop: 12 },
                  ]}
                  onPress={closeModal}
                >
                  <Text style={styles.actionText}>Đóng</Text>
                </Pressable>
              </ScrollView>
            </Animated.View>
          </Animated.View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#f97316", marginBottom: 16 },

  // Tabs
  tabs: { flexDirection: "row", marginBottom: 12 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
    borderColor: "#fcd34d",
  },
  tabActive: { borderColor: "#f97316" },
  tabText: { fontSize: 15, color: "#6b7280" },
  tabTextActive: { color: "#f97316", fontWeight: "700" },

  // Order list
  orderCard: {
    borderWidth: 2,
    borderLeftWidth: 6,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  customer: { fontWeight: "700", fontSize: 16, color: "#1f2937" },
  items: { color: "#6b7280", marginVertical: 6 },
  total: { color: "#16a34a", fontWeight: "700", fontSize: 15 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  statusText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  // Empty
  empty: { alignItems: "center", marginTop: 40 },
  emptyText: { color: "#9ca3af" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    maxHeight: "80%",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  modalLabel: { fontWeight: "600", marginBottom: 4 },
  modalItem: { marginLeft: 8, marginBottom: 2 },

  modalActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  actionText: { color: "#fff", fontWeight: "600" },
});
