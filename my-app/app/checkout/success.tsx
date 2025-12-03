// ==== SUCCESS SCREEN GIỮ NGUYÊN UI - CHỈ FIX LOGIC ====

import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Animated,
  Easing
} from "react-native";

import { useRef, useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import DroneTest from "../../components/map/drone-test";
import io, { Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCart } from "../context/CartContext";

function normalizeStatus(status?: string) {
  if (!status) return "pending";
  const s = status.toLowerCase();

  if (["pending"].includes(s)) return "pending";
  if (["confirmed", "preparing", "ready"].includes(s)) return "confirmed";
  if (["delivering", "shipping-to-customer"].includes(s)) return "delivering";
  if (s === "delivered") return "delivered";

  return "pending";
}

export default function SuccessScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { clearCartByRestaurant } = useCart();
// Popup xác nhận
const [showModal, setShowModal] = useState(false);

  const orderId = String(params.orderId || params.vnp_TxnRef || "");

  const [order, setOrder] = useState<any>(null);
  const [status, setStatus] = useState("loading");
  const [orderStatus, setOrderStatus] = useState("pending");

  const clearedCartRef = useRef(false);
  const socketRef = useRef<Socket | null>(null);

  // ================================
  // FETCH ORDER
  // ================================
  const fetchOrder = async () => {
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_STRAPI_URL}/api/orders/by-order-id/${orderId}`
      );
      const json = await res.json();

      if (!json?.data) return setStatus("failed");

      setOrder(json.data);
      setOrderStatus(normalizeStatus(json.data.statusOrder));
      setStatus("success");
    } catch {
      setStatus("failed");
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);


  useEffect(() => {
  if (orderStatus === "delivering") {
    setShowModal(true);
  }
}, [orderStatus]);

  // ================================
  // CLEAR CART
  // ================================
  useEffect(() => {
    if (status !== "success" || !order || clearedCartRef.current) return;

    const restId = Number(order?.restaurant?.id);
    if (restId) {
      clearCartByRestaurant(restId);
      AsyncStorage.removeItem("draft_order");
      clearedCartRef.current = true;
    }
  }, [status, order]);

  // ================================
  // SOCKET REALTIME
  // ================================
  useEffect(() => {
    if (status === "failed" || !orderId) return;

    const socket = io(process.env.EXPO_PUBLIC_STRAPI_URL!, {
      transports: ["websocket"],
      path: "/socket.io/"
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("identify", user?.id);
      socket.emit("drone:join", orderId);   // 👈 FIX: join room drone
    });

    socket.on("order:update", (data) => {
      if (String(data.orderID) !== orderId) return;

      setOrder((prev: any) => ({ ...prev, ...data }));
      setOrderStatus(normalizeStatus(data.statusOrder));
    });

    socket.on("drone:arrived", (data) => {
      if (String(data.orderID) === orderId) {
        console.log("🚁 ");
      }
    });

    return () => {socket.disconnect()};
  }, [orderId, status]);

  // ================================
  // CONFIRM DELIVERED — không fetchOrder!
  // ================================
  async function confirmDelivered() {
    try {
      await fetch(
        `${process.env.EXPO_PUBLIC_STRAPI_URL}/api/orders/customer-confirm/${order.id}`,
        { method: "POST" }
      );

      // ❗ FE KHÔNG FETCH ORDER
      // → chờ socket order:update trả về "delivered"
    } catch (e) {
      console.log("❌ confirmDelivered error:", e);
    }
  }

  // ================================
  // UI: LOADING
  // ================================
  if ((status === "loading" || !order) && status !== "failed") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FF6B35" size="large" />
        <Text style={styles.text}>Đang tải đơn hàng...</Text>
      </View>
    );
  }

  if (status === "failed") {
    return (
      <View style={styles.center}>
        <Text style={styles.failTitle}>❌ Không thể tải đơn hàng</Text>
        <Pressable style={styles.btn} onPress={() => router.replace("/")}>
          <Text style={styles.btnText}>Về trang chủ</Text>
        </Pressable>
      </View>
    );
  }

  const restaurant = order?.restaurant;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      

      <ScrollView style={styles.container}>
        <Pressable onPress={() => router.push("/(tabs)")}>
          <Text style={styles.backBtn}>← Quay lại</Text>
        </Pressable>

        <Text style={styles.title}>Drone Tracking #{orderId}</Text>

        {/* ⭐⭐ GIỮ NGUYÊN TIMELINE ⭐⭐ */}
        <Timeline orderStatus={orderStatus} />

        {/* ⭐ GIỮ NGUYÊN UI PHẦN INFO ⭐ */}
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Thông tin đơn hàng</Text>

          <Row label="Mã đơn" value={orderId} />
          <Row label="Điện thoại" value={order.phoneNumber || "—"} />
          <Row label="Ghi chú" value={order.note || "Không có"} />

          <View style={styles.line} />

          <Row label="Nhà hàng" value={restaurant?.name ?? "—"} />
          <Row label="Địa chỉ" value={restaurant?.address ?? "—"} />

          <View style={styles.line} />

          <Row
            label="Tổng tiền"
            value={order.totalPrice?.toLocaleString("vi-VN") + "đ"}
            highlight
          />
        </View>

        {/* ⭐ GIỮ NGUYÊN UI MAP ⭐ */}
        <View style={styles.mapBox}>
          <Text style={styles.mapTitle}>Theo dõi Drone</Text>

          <View style={{ height: 260, borderRadius: 12, overflow: "hidden" }}>
            <DroneTest orderId={orderId} order={order} />
          </View>
        </View>


      </ScrollView>

      {showModal && (
  <View style={styles.modalOverlay}>
    <View style={styles.modalBox}>
      <Text style={styles.modalTitle}>Xác nhận đã nhận hàng?</Text>
      <Text style={styles.modalText}>
        Bạn đã nhận hàng từ drone chưa?
      </Text>

      <Pressable
        style={[styles.modalBtn, { backgroundColor: "#FFFFFF", marginTop: 10 }]}
        onPress={() => {
          setShowModal(false);
          confirmDelivered();
        }}
      >
        <Text style={[styles.modalBtnText, { color: "black" }]}>
          Đã nhận hàng
        </Text>
      </Pressable>
    </View>
  </View>
)}
    </SafeAreaView>
  );
}

// =============================
// ⭐ GIỮ NGUYÊN 100% TIMELINE ⭐
// =============================
function Timeline({ orderStatus }: { orderStatus: string }) {
  const steps = [
    { key: "pending", label: "Đơn hàng đã đặt", icon: "cart-outline" },
    { key: "confirmed", label: "Nhà hàng đã nhận đơn", icon: "receipt-outline" },
    { key: "delivering", label: "Drone đang giao", icon: "cube-outline" },
    { key: "delivered", label: "Hoàn thành đơn hàng", icon: "home-outline" }
  ];

  const activeIndex = steps.findIndex((s) => s.key === orderStatus);

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: activeIndex,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false
    }).start();
  }, [activeIndex]);

  const lineWidth = progress.interpolate({
    inputRange: [0, steps.length - 1],
    outputRange: ["0%", "100%"]
  });

  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.3, duration: 500, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: false })
      ])
    ).start();
  }, []);

  return (
    <View style={styles.timelineWrapper}>
      <View style={styles.lineBackground} />
      <Animated.View style={[styles.lineProgress, { width: lineWidth }]} />

      <View style={styles.stepsRow}>
        {steps.map((step, index) => {
          const done = index <= activeIndex;
          const active = index === activeIndex;

          return (
            <View key={index} style={styles.stepItem}>
              <Animated.View
                style={[
                  styles.circle,
                  done && styles.circleDone,
                  active && {
                    transform: [{ scale: pulse }],
                    shadowColor: "#FF6B35",
                    shadowOpacity: 0.8,
                    shadowRadius: 10,
                    elevation: 8
                  }
                ]}
              >
                <Ionicons
                  name={step.icon as any}
                  size={18}
                  color={done ? "#fff" : "#999"}
                />
              </Animated.View>
              <Text style={[styles.stepText, done && styles.stepTextActive]}>
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// =============================
// ROW (GIỮ NGUYÊN)
// =============================
function Row({ label, value, highlight = false }: any) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.highlight]}>
        {value}
      </Text>
    </View>
  );
}

// =============================
// STYLES (GIỮ NGUYÊN 100%)
// =============================
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { marginTop: 8, color: "#666" },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 20 },
  box: {
    borderWidth: 1,
    borderColor: "#eee",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20
  },
  boxTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  rowLabel: { color: "#666" },
  rowValue: { fontWeight: "600" },
  highlight: { color: "#FF6B35", fontSize: 16 },
  line: { height: 1, backgroundColor: "#eee", marginVertical: 12 },
  mapBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 10,
    borderRadius: 10
  },
  mapTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  btn: {
    backgroundColor: "#FF6B35",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center"
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  failTitle: { fontSize: 18, color: "red", fontWeight: "700" },
  backBtn: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#FF6B35"
  },
  timelineWrapper: { marginVertical: 30, height: 100, justifyContent: "center" },
  lineBackground: {
    position: "absolute",
    top: 35,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#E0E0E0"
  },
  lineProgress: {
    position: "absolute",
    top: 35,
    left: 0,
    height: 3,
    backgroundColor: "#FF6B35"
  },
  stepsRow: { flexDirection: "row", justifyContent: "space-between" },
  stepItem: { alignItems: "center", width: "25%" },
  circle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#D9D9D9",
    borderWidth: 3,
    borderColor: "#C8C8C8",
    alignItems: "center",
    justifyContent: "center"
  },
  circleDone: { backgroundColor: "#FF6B35", borderColor: "#FF6B35" },
  stepText: {
    marginTop: 6,
    fontSize: 12,
    textAlign: "center",
    color: "#9E9E9E"
  },
  stepTextActive: { color: "#FF6B35", fontWeight: "700" },
  modalOverlay: {
  position: "absolute",
  left: 0,
  top: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(0,0,0,0.4)",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999,
},

modalBox: {
  width: "80%",
  backgroundColor: "#fff",
  padding: 20,
  borderRadius: 12,
  elevation: 10,
},

modalTitle: {
  fontSize: 18,
  fontWeight: "700",
  marginBottom: 10,
  textAlign: "center",
},

modalText: {
  fontSize: 14,
  color: "#555",
  textAlign: "center",
  marginBottom: 20,
},

modalButtons: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 10,
},

modalBtn: {
  flex: 1,
  paddingVertical: 12,
  borderRadius: 10,
  alignItems: "center",
  marginHorizontal: 5,
},

modalBtnText: {
  fontSize: 15,
  fontWeight: "600",
},

});
