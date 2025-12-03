import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { API_URL } from "@/lib/apiConfig";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

// ==============================
// TYPES
// ==============================
type StrapiImage = {
  url?: string;
  formats?: any;
};

type Dish = {
  name: string;
  image?: StrapiImage;
};

type OrderItem = {
  quantity: number;
  price: number;
  notes?: string;
  dish: Dish;
};

type Restaurant = {
  name: string;
  address: string;
  image?: StrapiImage;
};

type Order = {
  orderID: string;
  createdAt: string;
  totalPrice: number;
  deliveryAddress: string;
  restaurant: Restaurant;
  order_items: OrderItem[];
};

// ==============================
// FORMAT TIỀN
// ==============================
const formatVND = (n: number) =>
  (n || 0).toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
  });

// ==============================
// GET IMAGE HELPERS
// ==============================
const getDishImage = (item: OrderItem) => {
  const img = item?.dish?.image;
  if (!img) return null;
  return (
    img?.formats?.thumbnail?.url ||
    img?.formats?.small?.url ||
    img?.url ||
    null
  );
};

const getRestaurantImage = (order: Order) => {
  const img = order?.restaurant?.image;
  if (!img) return null;

  return (
    img?.formats?.thumbnail?.url ||
    img?.formats?.small?.url ||
    img?.url ||
    null
  );
};

export default function OrderDetailScreen() {
  const router = useRouter();
  const { orderID } = useLocalSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // ==============================
  // LOAD ORDER
  // ==============================
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `${API_URL}/api/orders/by-order-id/${orderID}?populate[order_items][populate][dish][populate]=image&populate[restaurant][populate]=image`
        );
        const json = await res.json();
        setOrder(json.data || null);
      } catch (e) {
        console.log("Order detail error:", e);
      } finally {
        setLoading(false);
      }
    }

    if (orderID) load();
  }, [orderID]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }}>
        <View style={styles.center}>
          <ActivityIndicator color="#EE6E19" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }}>
        <View style={styles.center}>
          <Text style={{ fontSize: 16 }}>Không tìm thấy đơn hàng.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const restaurantImg = getRestaurantImage(order);

  // ==============================
  // UI
  // ==============================
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }}>
      <ScrollView style={styles.container}>
        {/* BACK BUTTON */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace("../(tabs)/orders")}
        >
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>

        {/* TIME HEADER */}
        <View style={styles.timeHeader}>
          <Text style={styles.timeText}>
            {new Date(order.createdAt).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>

          <Text style={styles.timeSub}>
            {new Date(order.createdAt).toLocaleDateString("vi-VN", {
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </Text>
        </View>

        {/* =============================== */}
        {/* ⭐ MÃ ĐƠN + NÚT DRONE TRACKING ⭐ */}
        {/* =============================== */}
        <View style={styles.orderCodeBox}>
          <View style={styles.codeRow}>
            <View>
              <Text style={styles.orderCodeLabel}>Mã đặt hàng</Text>
              <Text style={styles.orderCodeValue}>{order.orderID}</Text>
            </View>

            <Pressable
              onPress={() =>
                router.push(`/checkout/success?orderId=${order.orderID}`)
              }
              style={styles.trackBtn}
            >
              <Ionicons name="airplane" size={16} color="#fff" />
              <Text style={styles.trackBtnText}>Drone tracking</Text>
            </Pressable>
          </View>
        </View>

        {/* RESTAURANT INFO */}
        <View style={styles.restaurantBox}>
          <View style={styles.restaurantRow}>
            <Image
              source={{
                uri:
                  restaurantImg ||
                  "https://cdn-icons-png.flaticon.com/512/385/385350.png",
              }}
              style={styles.restaurantAvatar}
            />

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.restaurantName}>
                {order.restaurant?.name}
              </Text>
              <Text style={styles.restaurantStatus}>Đã giao • Nhà hàng</Text>
            </View>
          </View>
        </View>

        {/* ADDRESS */}
        <View style={styles.box}>
          <View style={styles.addrRow}>
            <Ionicons name="location" size={20} color="#EE6E19" />
            <Text style={styles.addrText}>{order.restaurant?.address}</Text>
          </View>

          <View style={[styles.addrRow, { marginTop: 12 }]}>
            <Ionicons name="person" size={20} color="#EE6E19" />
            <Text style={styles.addrText}>{order.deliveryAddress}</Text>
          </View>
        </View>

        {/* SUMMARY */}
        <Text style={styles.sectionTitle}>Tóm tắt đơn hàng</Text>

        <View style={styles.box}>
          {order.order_items.map((item, idx) => {
            const image = getDishImage(item);
            return (
              <View key={idx} style={styles.itemRow}>
                {image ? (
                  <Image source={{ uri: image }} style={styles.itemImg} />
                ) : (
                  <View style={[styles.itemImg, styles.itemImgPlaceholder]}>
                    <Ionicons
                      name="image-outline"
                      size={20}
                      color="#9CA3AF"
                    />
                  </View>
                )}

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.itemName}>
                    {item.dish?.name} × {item.quantity}
                  </Text>

                  {item.notes ? (
                    <Text style={styles.itemNote}>Ghi chú: {item.notes}</Text>
                  ) : null}
                </View>

                <Text style={styles.itemPrice}>
                  {formatVND(item.price * item.quantity)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* TOTAL */}
        <View style={[styles.box, styles.totalBox]}>
          <Text style={styles.totalLabel}>Tổng cộng</Text>
          <Text style={styles.totalValue}>
            {formatVND(order.totalPrice)}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ==============================
// STYLES
// ==============================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  backBtn: {
    position: "absolute",
    top: 15,
    left: 16,
    zIndex: 10,
    backgroundColor: "#FFF",
    padding: 8,
    borderRadius: 50,
    elevation: 3,
  },

  timeHeader: {
    alignItems: "center",
    paddingVertical: 16,
  },

  timeText: {
    fontSize: 20,
    fontWeight: "700",
  },

  timeSub: {
    marginTop: 4,
    fontSize: 15,
    color: "#666",
  },

  orderCodeBox: {
    padding: 16,
    backgroundColor: "#EE6E19",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  codeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  orderCodeLabel: {
    fontSize: 14,
    color: "#fff",
  },

  orderCodeValue: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 4,
    color: "#fff",
  },

  /** Nút Drone Tracking */
  trackBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF8A3D",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  trackBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  restaurantBox: {
    backgroundColor: "#fff",
    padding: 16,
    marginTop: 10,
  },
  restaurantRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  restaurantAvatar: {
    width: 80,
    height: 52,
  },
  restaurantName: {
    fontSize: 17,
    fontWeight: "700",
  },
  restaurantStatus: {
    fontSize: 13,
    color: "#888",
    marginTop: 3,
  },

  box: {
    backgroundColor: "#fff",
    padding: 16,
    marginTop: 10,
  },

  addrRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  addrText: {
    marginLeft: 10,
    fontSize: 15,
    flex: 1,
  },

  sectionTitle: {
    marginTop: 16,
    marginLeft: 14,
    fontSize: 17,
    fontWeight: "700",
  },

  itemRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  itemImg: {
    width: 54,
    height: 54,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  itemImgPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
  },
  itemNote: {
    fontSize: 12,
    color: "#888",
    marginTop: 3,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "700",
  },

  totalBox: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: "700",
  },
  totalValue: {
    fontSize: 17,
    fontWeight: "700",
  },
});
