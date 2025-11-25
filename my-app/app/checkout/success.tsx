import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import DroneTest from "../../components/map/drone-test";
import io, { Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

function normalizeStatus(
  status?: string
): "pending" | "confirmed" | "delivering" | "delivered" {
  if (!status) return "pending";
  const s = status.toLowerCase();

  if (["pending"].includes(s)) return "pending";
  if (["confirmed", "preparing", "ready"].includes(s)) return "confirmed";
  if (["delivering", "shipping-to-restaurant", "shipping-to-customer"].includes(s))
    return "delivering";
  if (s === "delivered") return "delivered";

  return "pending";
}

export default function SuccessScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const orderId = String(params.orderId || params.vnp_TxnRef || "");

  const [order, setOrder] = useState<any>(null);
  const [status, setStatus] = useState<"loading" | "success" | "failed">(
    "loading"
  );
  const [orderStatus, setOrderStatus] =
    useState<"pending" | "confirmed" | "delivering" | "delivered">("pending");

  // ----------------------------------------------------------
  // 1. Detect VNPAY fail
  // ----------------------------------------------------------
  useEffect(() => {
    const code = params?.vnp_ResponseCode as string | undefined;
    if (code && code !== "00") setStatus("failed");
    else setStatus("success");
  }, [params]);

  // ----------------------------------------------------------
  // 2. Fetch Order (backend phải mở route by-order-id)
  // ----------------------------------------------------------
  const fetchOrder = async () => {
    if (!orderId) {
      setStatus("failed");
      return;
    }

    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_STRAPI_URL}/api/orders/by-order-id/${orderId}`
      );
      const json = await res.json();

      if (!json?.data) {
        console.log("❌ Không tìm thấy đơn hàng", json);
        setStatus("failed");
        return;
      }

      setOrder(json.data);
      setOrderStatus(normalizeStatus(json.data.statusOrder));
      setStatus("success");
    } catch (err) {
      console.log("❌ Lỗi fetch order:", err);
      setStatus("failed");
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  // ----------------------------------------------------------
  // 3. SOCKET: listen order:update
  // ----------------------------------------------------------
  useEffect(() => {
    if (!user?.id || !orderId || status === "failed") return;

    const socket: Socket = io(process.env.EXPO_PUBLIC_STRAPI_URL!, {
      transports: ["websocket"],
      path: "/socket.io/",
    });

    socket.on("connect", () => {
      console.log("🟢 WS connected:", socket.id);
      socket.emit("identify", user.id);
    });

    socket.on("order:update", (data: any) => {
      const incomingId = String(data.orderID || data.orderId || "");

      if (incomingId === orderId) {
        console.log("📦 order:update", data);
        setOrder(data);
        setOrderStatus(normalizeStatus(data.statusOrder));
      }
    });

    return () => { socket.disconnect() };
  }, [orderId, user?.id, status]);

  // ----------------------------------------------------------
  // UI: LOADING
  // ----------------------------------------------------------
  if ((status === "loading" || !order) && status !== "failed") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FF6B35" size="large" />
        <Text style={styles.text}>Đang tải đơn hàng...</Text>
      </View>
    );
  }

  // ----------------------------------------------------------
  // UI: FAILED
  // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  // UI: SUCCESS
  // ----------------------------------------------------------
  const restaurant = order?.restaurant;
  const phone = order?.phoneNumber || "—";
  const note = order?.note || "Không có";
  const total = order?.totalPrice || 0;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🎉 Đặt hàng thành công!</Text>

      <Timeline orderStatus={orderStatus} />

      {/* ORDER INFO */}
      <View style={styles.box}>
        <Text style={styles.boxTitle}>Thông tin đơn hàng</Text>

        <Row label="Mã đơn" value={orderId} />
        <Row label="Điện thoại" value={phone} />
        <Row label="Ghi chú" value={note} />

        <View style={styles.line} />

        <Row label="Nhà hàng" value={restaurant?.name ?? "—"} />
        <Row label="Địa chỉ" value={restaurant?.address ?? "—"} />

        <View style={styles.line} />

        <Row label="Tổng tiền" value={`${total}₫`} highlight />
      </View>

      {/* MINI MAP */}
      <View style={styles.mapBox}>
        <Text style={styles.mapTitle}>Theo dõi Drone</Text>

        <View style={{ height: 260, borderRadius: 12, overflow: "hidden" }}>
          {order && (
            <DroneTest orderId={orderId} order={order} />
          )}
        </View>
      </View>

      {(orderStatus === "confirmed" || orderStatus === "delivering") && (
        <Pressable
          style={styles.btn}
          onPress={() => router.push(`../../components/map/drone-test/${orderId}`)}
        >
          <Text style={styles.btnText}>Xem đường bay drone</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

// =======================================================
// COMPONENTS
// =======================================================
function Timeline({ orderStatus }: { orderStatus: string }) {
  return (
    <View style={styles.timeline}>
      <Step label="pending" icon="🕒" active={orderStatus === "pending"} />
      <Step label="confirmed" icon="👨‍🍳" active={orderStatus === "confirmed"} />
      <Step label="delivering" icon="🚁" active={orderStatus === "delivering"} />
      <Step label="delivered" icon="🏠" active={orderStatus === "delivered"} />
    </View>
  );
}

function Step({ label, icon, active }: any) {
  return (
    <View style={styles.step}>
      <Text style={[styles.stepIcon, active && styles.activeText]}>{icon}</Text>
      <Text style={[styles.stepLabel, active && styles.activeText]}>{label}</Text>
    </View>
  );
}

function Row({ label, value, highlight = false }: any) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.highlight]}>{value}</Text>
    </View>
  );
}

// =======================================================
// STYLES
// =======================================================
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { marginTop: 8, color: "#666" },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 20 },

  timeline: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  step: { alignItems: "center" },
  stepIcon: { fontSize: 26, opacity: 0.3 },
  stepLabel: { fontSize: 12, opacity: 0.3 },
  activeText: { opacity: 1, color: "#FF6B35", fontWeight: "700" },

  box: {
    borderWidth: 1,
    borderColor: "#eee",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
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
    borderRadius: 10,
  },
  mapTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },

  btn: {
    backgroundColor: "#FF6B35",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 30,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  failTitle: { fontSize: 18, color: "red", fontWeight: "700" },
});
