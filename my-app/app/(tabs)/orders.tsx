import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Image,
  Animated,
} from "react-native";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "@/lib/apiConfig";
import { useRouter } from "expo-router";
import Navigation from "@/components/Navigation";
import { SafeAreaView } from "react-native-safe-area-context";

const formatVND = (num: number) =>
  (num || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND" });

function getStatusMeta(statusRaw: string) {
  const status = (statusRaw || "pending").toLowerCase();

  switch (status) {
    case "pending": return { label: "Đang chờ", color: "#7C3AED" };
    case "confirmed": return { label: "Đã xác nhận", color: "#F97316" };
    case "ready": return { label: "Sẵn sàng", color: "#0EA5E9" };
    case "delivering": return { label: "Đang giao", color: "#16A34A" };
    case "delivered": return { label: "Đã giao", color: "#16A34A" };
    case "canceled":
    case "cancel": return { label: "Đã huỷ", color: "#DC2626" };
    default: return { label: statusRaw, color: "#6B7280" };
  }
}

export default function OrdersScreen() {
  const { jwt } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });

      const json = await res.json();
      setOrders(json.data || []);
    } catch (err) {
      console.warn("Fetch orders error:", err);
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

  // ⭐ Scroll animation
  const scrollY = useRef(new Animated.Value(0)).current;

  const navbarTranslate = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [0, -120],
    extrapolate: "clamp",
  });

  // ⭐ Render Item — KHÔNG dùng SafeAreaView ở đây!
  const renderItem = (item: any) => {
    const restaurant = item.restaurant || {};

    const createdTime = new Date(item.createdAt).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const createdDate = new Date(item.createdAt).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const status = getStatusMeta(item.statusOrder);
    const itemCount = item.order_items?.length || 1;

    const image =
      restaurant?.image?.url ||
      "https://cdn-icons-png.flaticon.com/512/385/385350.png";

    return (
      <Pressable
        key={item.id}
        style={styles.row}
        onPress={() => router.push(`../orders/${item.orderID}`)}
      >
        <Image source={{ uri: image }} style={styles.avatar} />

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.restaurantName}>
            {restaurant.name || "Nhà hàng"}
          </Text>

          <Text style={styles.subInfo}>{itemCount} món</Text>
          <Text style={styles.subInfo}>{createdTime}, {createdDate}</Text>

          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>

        <Text style={styles.price}>{formatVND(item.totalPrice)}</Text>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#EE6E19" />
        </View>
      </SafeAreaView>
    );
  }

  // ⭐ Main
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }}>
      <View style={{ flex: 1 }}>

        {/* NAVIGATION FIXED */}
        <Animated.View
          style={[
            styles.navWrapper,
            { transform: [{ translateY: navbarTranslate }] },
          ]}
        >
          <Navigation />
        </Animated.View>

        {/* CONTENT */}
        <Animated.ScrollView
          style={{ flex: 1 }}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
        >
          <View style={{ height: 130 }} />

          <View style={styles.header}>
            <Text style={styles.title}>Hoạt động</Text>
            <Text style={styles.recent}>Gần đây</Text>
          </View>

          <View style={{ paddingBottom: 60 }}>
            {orders.map((o) => renderItem(o))}
          </View>
        </Animated.ScrollView>
      </View>
    </SafeAreaView>
  );
}

//
// ⭐ STYLES giống HomePage ⭐
//
const styles = StyleSheet.create({
  navWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: "#fff",
    elevation: 10,
    paddingBottom: 4,
  },

  header: {
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },

  title: { fontSize: 28, fontWeight: "700", color: "#1F2937" },
  recent: {
    marginTop: 6,
    fontSize: 16,
    color: "#6B7280",
  },

  row: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    alignItems: "center",
    borderColor: "#E5E7EB",
    borderWidth: 1,
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#eee",
  },

  restaurantName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },

  subInfo: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },

  statusText: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: "700",
  },

  price: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
