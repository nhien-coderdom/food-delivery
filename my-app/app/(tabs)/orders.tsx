import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "@/lib/apiConfig";

export default function OrdersScreen() {
  const { user, jwt } = useAuth();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchOrders = useCallback(async () => {
    if (!jwt) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (!res.ok) {
        console.warn("Failed fetching orders", res.status);
        setOrders([]);
        return;
      }

      const json = await res.json();
      setOrders(json.data || []);
    } catch (err) {
      console.warn("Fetch orders error", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [jwt]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: any }) => {
    const restaurant = item.restaurant || {};
    return (
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderId}>#{item.orderID}</Text>
          <Text style={styles.restaurant}>{restaurant.name || "—"}</Text>
          <Text style={styles.meta}>{item.phoneNumber || "—"} • {item.totalPrice || 0}₫</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.status}>{(item.statusOrder || "pending").toUpperCase()}</Text>
          <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FF6B35" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={orders}
      keyExtractor={(i) => String(i.id)}
      renderItem={renderItem}
      ListHeaderComponent={() => (
        <View style={styles.header}>
          <Text style={styles.title}>My Orders</Text>
        </View>
      )}
      ListEmptyComponent={() => (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={80} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySubtitle}>
            Start ordering delicious food from your favorite restaurants!
          </Text>
        </View>
      )}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    backgroundColor: "#FFF",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  },
  
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  row: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },

  orderId: { fontSize: 14, fontWeight: "700", color: "#111" },
  restaurant: { fontSize: 13, color: "#374151", marginTop: 4 },
  meta: { fontSize: 12, color: "#6B7280", marginTop: 6 },

  status: { fontSize: 12, fontWeight: "800", color: "#FF6B35" },
  date: { fontSize: 11, color: "#9CA3AF", marginTop: 6 },
});
