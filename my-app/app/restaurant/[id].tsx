import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { API_URL, getImageUrl } from "@/lib/apiConfig";
import { useCart } from "@/app/context/CartContext";
import CartBar from "@/components/CartBar";
import { shadows } from "@/lib/shadowStyles";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/app/context/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";

/* ------------------ TYPES ------------------ */

interface Category {
  id: number;
  name: string;
  documentId: string;
}

interface Dish {
  id: number;
  name: string;
  price: number;
  image?: { url: string };
  category?: Category | null;
}

interface Restaurant {
  id: number;
  documentId: string;
  name: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  image?: { url: string };
  dishes?: Dish[];
  rating?: number;
  deliveryFee?: number;
  deliveryTime?: number;
  openingHours?: string;
  closingHours?: string;
}

interface CategoryChip {
  id: string;
  name: string;
}

/* FORMAT MONEY */
const formatVND = (num: number) =>
  num?.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

/* ------------------ MAIN COMPONENT ------------------ */

export default function RestaurantDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [selectedCat, setSelectedCat] = useState("all");
  const [loading, setLoading] = useState(true);
  const { jwt } = useAuth();
  const { addItem, updateQuantity, selectRestaurant, currentCart } = useCart();

  /* FETCH RESTAURANT */
  useEffect(() => {
    async function fetchRestaurant() {
      try {
        const url =
          `${API_URL}/api/restaurants` +
          `?filters[documentId][$eq]=${id}` +
          `&populate[image]=true` +
          `&populate[dishes][populate][image]=true` +
          `&populate[dishes][populate][category]=true`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${jwt}` },
        });

        const json = await res.json();
        const data = json.data?.[0];

        if (data) {
          setRestaurant(data);
          selectRestaurant(data.id, data.name);
        }
      } catch (e) {
        setRestaurant(null);
      } finally {
        setLoading(false);
      }
    }

    if (jwt) fetchRestaurant();
  }, [id, jwt]);

  if (loading) {
    return (
      <ActivityIndicator
        style={{ marginTop: 80 }}
        size="large"
        color="#FF6B35"
      />
    );
  }

  if (!restaurant) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>Không tìm thấy nhà hàng.</Text>
      </SafeAreaView>
    );
  }

  /* SAFE DISHES */
  const dishes: Dish[] = restaurant.dishes ?? [];

  /* BUILD CATEGORIES SAFE */
  const categories: CategoryChip[] = [
    { id: "all", name: "Tất cả" },
    ...Array.from(
      new Map(
        dishes
          .filter((d) => d.category?.documentId)
          .map((d) => [
            d.category!.documentId,
            {
              id: d.category!.documentId,
              name: d.category!.name,
            } as CategoryChip,
          ])
      ).values()
    ),
  ];

  /* FILTER DISHES */
  const filteredDishes =
    selectedCat === "all"
      ? dishes
      : dishes.filter((d) => d.category?.documentId === selectedCat);

  /* ------------------ RENDER ------------------ */

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>

      <ScrollView contentContainerStyle={styles.body}>

        {/* HEADER LOGO */}
        <View style={styles.headerWrapper}>
          <Image
            source={{ uri: getImageUrl(restaurant.image?.url) }}
            style={styles.headerImage}
            resizeMode="contain"
          />

          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color="#111" />
          </Pressable>
        </View>

        {/* NAME */}
        <Text style={styles.title}>{restaurant.name}</Text>

        {/* INFO BADGES */}
        <View style={styles.infoRow}>
          <View style={styles.iconBadge}>
            <Ionicons name="star" size={14} color="#FFB800" />
            <Text style={styles.infoText}>{restaurant.rating ?? "N/A"}</Text>
          </View>
          <View style={styles.iconBadge}>
            <Ionicons name="bicycle" size={14} color="#10B981" />
            <Text style={styles.infoText}>
              {restaurant.deliveryFee
                ? formatVND(restaurant.deliveryFee)
                : "Free"}
            </Text>
          </View>
          <View style={styles.iconBadge}>
            <Ionicons name="time-outline" size={14} color="#6B7280" />
            <Text style={styles.infoText}>
              {restaurant.deliveryTime || 30} min
            </Text>
          </View>
        </View>

        {/* ADDRESS */}
        {restaurant.address && (
          <View style={styles.detailRow}>
            <Ionicons name="location" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{restaurant.address}</Text>
          </View>
        )}

        {/* CATEGORY CHIPS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginVertical: 10 }}
          contentContainerStyle={{ gap: 10, paddingRight: 16 }}
        >
          {categories.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => setSelectedCat(cat.id)}
              style={[
                styles.chip,
                selectedCat === cat.id && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedCat === cat.id && styles.chipTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* LIST OF DISHES */}
        <View style={styles.grid}>
          {filteredDishes.map((dish) => {
            const imgUrl = getImageUrl(dish.image?.url);
            const qty =
              currentCart?.find((it) => it.dishId === dish.id)?.quantity ?? 0;

            return (
              <View key={dish.id} style={styles.rowCard}>
                <Image source={{ uri: imgUrl }} style={styles.rowImage} />

                <View style={styles.rowMiddle}>
                  <Text style={styles.rowTitle}>{dish.name}</Text>
                  <Text style={styles.rowSubtitle}>
                    {dish.category?.name ?? ""}
                  </Text>
                  <Text style={styles.rowFinalPrice}>
                    {formatVND(dish.price)}
                  </Text>
                </View>

                {/* BUTTONS */}
                <View style={styles.rowRight}>
                  {qty === 0 ? (
                    <Pressable
                      onPress={() =>
                        addItem({
                          dishId: dish.id,
                          name: dish.name,
                          price: dish.price,
                          restaurantId: restaurant.id,
                          restaurantName: restaurant.name,
                          image: imgUrl,
                        })
                      }
                      style={styles.addBtn}
                    >
                      <Ionicons name="add" size={18} color="#fff" />
                    </Pressable>
                  ) : (
                    <View style={styles.qtyRow}>
                      <Pressable
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(dish.id, qty - 1)}
                      >
                        <Text style={styles.qtyText}>−</Text>
                      </Pressable>

                      <Text style={styles.qtyNumber}>{qty}</Text>

                      <Pressable
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(dish.id, qty + 1)}
                      >
                        <Text style={styles.qtyText}>+</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* FIXED CART BAR */}
      <CartBar />

    </SafeAreaView>
  );
}

/* ------------------ STYLES ------------------ */

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  body: { padding: 16, paddingBottom: 140 },

  headerWrapper: {
    width: "100%",
    height: 220,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  headerImage: { width: "100%", height: "100%" },

  backButton: {
    position: "absolute",
    top: 20,
    left: 16,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 30,
    ...shadows.small,
  },

  title: { fontSize: 24, fontWeight: "700", marginTop: 10 },

  infoRow: { flexDirection: "row", gap: 12, marginTop: 6 },
  iconBadge: { flexDirection: "row", gap: 4, alignItems: "center" },
  infoText: { fontSize: 13, color: "#4B5563" },

  detailRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    marginTop: 8,
  },
  detailText: { fontSize: 13, color: "#6B7280", flex: 1 },

  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#F3F4F6",
    borderRadius: 22,
  },
  chipActive: { backgroundColor: "#FF6B35" },
  chipText: { fontSize: 14, color: "#4B5563" },
  chipTextActive: { color: "#fff" },

  grid: { width: "100%", flexDirection: "column", marginTop: 12 },

  rowCard: {
    flexDirection: "row",
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },

  rowImage: {
    width: 85,
    height: 85,
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: "#f3f4f6",
  },

  rowMiddle: { flex: 1 },

  rowTitle: { fontSize: 16, fontWeight: "600" },
  rowSubtitle: { fontSize: 13, color: "#6B7280" },

  rowFinalPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#16a34a",
    marginTop: 4,
  },

  rowRight: { justifyContent: "center", alignItems: "center" },

  addBtn: {
    backgroundColor: "#FF6B35",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  qtyRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  qtyBtn: {
    backgroundColor: "#F3F4F6",
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  qtyText: { fontSize: 18, fontWeight: "700", color: "#FF6B35" },

  qtyNumber: { minWidth: 24, textAlign: "center", fontSize: 15 },
});
