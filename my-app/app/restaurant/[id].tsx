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
import { useCart } from "@/components/CartContext";
import CartBar from "@/components/CartBar";
import { shadows } from "@/lib/shadowStyles";
import { Ionicons } from "@expo/vector-icons";

// Format tiền tệ
const formatVND = (num: number) =>
  num?.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

interface CategoryChip {
  id: string;
  name: string;
}

export default function RestaurantDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [selectedCat, setSelectedCat] = useState("all");
  const [loading, setLoading] = useState(true);

  // ✅ Context mới — không cần getItemQuantity
  const { addItem, updateQuantity, selectRestaurant, currentCart } = useCart();

  useEffect(() => {
    async function fetchRestaurant() {
      try {
        const data = await fetch(
          `${API_URL}/api/restaurants?filters[documentId][$eq]=${id}&populate[image]=true&populate[dishes][populate][image]=true&populate[dishes][populate][category]=true&populate[categories]=true`
        );
        const json = await data.json();
        const res = json.data?.[0];
        setRestaurant(res);
        if (res) {
          selectRestaurant(res.id, res.name); // ✅ Chọn đúng giỏ cho nhà hàng này
        }
      } catch (err) {
        console.warn("Lỗi tải dữ liệu nhà hàng:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRestaurant();
  }, [id]);

  if (loading)
    return <ActivityIndicator style={{ marginTop: 80 }} size="large" color="#FF6B35" />;

  if (!restaurant) return <Text>Không tìm thấy nhà hàng.</Text>;

  const dishes = restaurant.dishes || [];

  // ✅ Lấy danh mục từ API
  const categories: CategoryChip[] = [
    { id: "all", name: "Tất cả" },
    ...(restaurant.categories?.map((c: any) => ({
      id: c.id.toString(),
      name: c.name,
    })) || []),
  ];

  // ✅ Lọc món theo danh mục
  const filteredDishes =
    selectedCat === "all"
      ? dishes
      : dishes.filter((d: any) => d.category?.id?.toString() === selectedCat);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header Image */}
      <View style={styles.headerWrapper}>
        <Image
          source={{ uri: getImageUrl(restaurant.image?.url) }}
          style={styles.headerImage}
        />

        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>{restaurant.name}</Text>

        <View style={styles.infoRow}>
          <View style={styles.iconBadge}>
            <Ionicons name="star" size={14} color="#FFB800" />
            <Text style={styles.infoText}>4.7</Text>
          </View>
          <View style={styles.iconBadge}>
            <Ionicons name="bicycle" size={14} color="#10B981" />
            <Text style={styles.infoText}>Miễn phí</Text>
          </View>
          <View style={styles.iconBadge}>
            <Ionicons name="time-outline" size={14} color="#6B7280" />
            <Text style={styles.infoText}>20 phút</Text>
          </View>
        </View>

        <Text style={styles.description}>{restaurant.description}</Text>

        {/* Category Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginVertical: 10 }}
          contentContainerStyle={{ gap: 10 }}
        >
          {categories.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => setSelectedCat(cat.id)}
              style={[styles.chip, selectedCat === cat.id && styles.chipActive]}
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

        {/* Dishes */}
        <View style={styles.grid}>
          {filteredDishes.map((dish: any) => {
            const imgUrl = getImageUrl(dish.image?.url);
            const qty =
              (currentCart ?? []).find((it) => it.dishId === dish.id)?.quantity ?? 0;


            return (
              <View key={dish.id} style={styles.card}>
                <Image source={{ uri: imgUrl }} style={styles.dishImage} />
                <View style={styles.cardContent}>
                  <Text style={styles.dishName}>{dish.name}</Text>
                  <Text style={styles.dishPrice}>{formatVND(dish.price)}</Text>

                  {qty === 0 ? (
                    <Pressable
                      onPress={() =>
                        addItem({
                          dishId: dish.id,
                          name: dish.name,
                          price: dish.price ?? 0,
                          restaurantId: restaurant.id,
                          restaurantName: restaurant.name,
                          image: imgUrl,
                        })
                      }
                      style={styles.addBtn}
                    >
                      <Text style={styles.addBtnText}>+</Text>
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

      <CartBar />
    </View>
  );
}

/* ---------- STYLES ---------- */

const cardWidth = Platform.select({
  web: "calc(33% - 14px)",
  default: "100%",
});

const styles = StyleSheet.create({
  headerWrapper: { width: "100%", height: 220, position: "relative" },
  headerImage: { width: "100%", height: "100%" },
  backButton: {
    position: "absolute",
    top: 40,
    left: 16,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 30,
    ...shadows.small,
  },
  body: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 24, fontWeight: "700", marginTop: 10 },
  infoRow: { flexDirection: "row", gap: 12, marginTop: 6 },
  iconBadge: { flexDirection: "row", gap: 4, alignItems: "center" },
  infoText: { fontSize: 13, color: "#4B5563", fontWeight: "500" },
  description: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 10,
    lineHeight: 20,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#F3F4F6",
    borderRadius: 22,
    marginRight: 10,
  },
  chipActive: { backgroundColor: "#FF6B35" },
  chipText: { fontSize: 14, color: "#4B5563", fontWeight: "500" },
  chipTextActive: { color: "#fff" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: Platform.OS === "web" ? "flex-start" : "center",
    marginTop: 12,
  },
  card: {
    width: cardWidth as any,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    ...shadows.card,
  },
  dishImage: { width: "100%", height: 160 },
  cardContent: { padding: 10 },
  dishName: { fontSize: 16, fontWeight: "600" },
  dishPrice: { fontSize: 14, color: "#16a34a", marginVertical: 6 },
  addBtn: {
    backgroundColor: "#FF6B35",
    width: 36,
    height: 36,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { color: "#fff", fontSize: 20 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: {
    backgroundColor: "#F3F4F6",
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  qtyText: { fontSize: 18, fontWeight: "700", color: "#FF6B35" },
  qtyNumber: {
    minWidth: 24,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
  },
});
