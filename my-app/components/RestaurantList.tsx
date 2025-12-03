import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { API_URL, getImageUrl } from "@/lib/apiConfig";
import { shadows } from "@/lib/shadowStyles";
import { useAuth } from "@/app/context/AuthContext";

interface Category {
  id: number;
  name: string;
  documentId: string;
}

interface Dish {
  id: number;
  name: string;
  price: number;
  category?: Category | null;
}

interface Restaurant {
  id: number;
  documentId: string;
  name: string;
  image?: { url: string };
  dishes?: Dish[];
}

interface RestaurantListProps {
  query?: string;
  category?: string; // category documentId
}

export default function RestaurantList({
  query = "",
  category = "all",
}: RestaurantListProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { jwt } = useAuth();

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(
          `${API_URL}/api/restaurants?populate[image]=true&populate[dishes][populate][category]=true`,
          {
            headers: {
              Authorization: `Bearer ${jwt}`,
            },
          }
        );

        const json = await res.json();
        setRestaurants(Array.isArray(json.data) ? json.data : []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [jwt]);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );

  if (error)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );

  if (!restaurants.length)
    return (
      <View style={styles.center}>
        <Ionicons name="restaurant-outline" size={60} color="#aaa" />
        <Text style={styles.emptyText}>No restaurants found</Text>
      </View>
    );

  // ---- 🔥 Tính toán category cho restaurant dựa trên các dish ----
  const filterRestaurants = restaurants.filter((r) => {
    const matchQuery = r?.name?.toLowerCase().includes(query.toLowerCase());

    if (category === "all") return matchQuery;

    const restaurantCategories = Array.from(
      new Set(
        r?.dishes
          ?.map((d) => d?.category?.documentId)
          .filter(Boolean)
      )
    );

    const matchCategory = restaurantCategories.includes(category);

    return matchQuery && matchCategory;
  });

  if (!filterRestaurants.length)
    return (
      <View style={styles.center}>
        <Ionicons name="search-outline" size={60} color="#ccc" />
        <Text style={styles.emptyText}>No restaurants match your filter</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      {filterRestaurants.map((res) => {
        const imgUrl = getImageUrl(res?.image?.url);

        // 🔥 Extract category names from dishes
        const restaurantCategoryNames = Array.from(
          new Set(
            res?.dishes
              ?.map((d) => d?.category?.name)
              .filter(Boolean)
          )
        );

        const rating = (4 + Math.random() * 0.7).toFixed(1);
        const delivery = Math.floor(Math.random() * 20) + 15;

        return (
          <Link key={res.id} href={`../restaurant/${res.documentId}`} asChild>
            <Pressable style={styles.card}>
              <Image source={{ uri: imgUrl }} style={styles.cardImage} />

              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.restaurantName} numberOfLines={1}>
                    {res.name}
                  </Text>

                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#FFB800" />
                    <Text style={styles.ratingText}>{rating}</Text>
                  </View>
                </View>

                {/* ---- 🔥 FIXED CATEGORY DISPLAY ---- */}
                <Text style={styles.restaurantCategory}>
                  {restaurantCategoryNames.length
                    ? restaurantCategoryNames.join(" • ")
                    : "No category"}
                </Text>

                <View style={styles.footer}>
                  <Ionicons name="time-outline" size={14} color="#6B7280" />
                  <Text style={styles.timeText}>{delivery} min</Text>
                </View>
              </View>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

// ------------------- STYLES -------------------

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  errorText: { color: "#F87171", fontSize: 14 },
  emptyText: { color: "#6B7280", fontSize: 16, marginTop: 8 },
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
    paddingHorizontal: 15,
  },
  card: {
    width: Platform.select({
      web: "calc(25% - 20px)",
      default: "100%",
    }) as any,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    ...shadows.card,
  },
  cardImage: {
    width: "100%",
    height: Platform.select({ web: 210, default: 200 }) as number,
    backgroundColor: "#eee",
  },
  cardContent: { padding: 12 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  ratingBadge: {
    flexDirection: "row",
    paddingHorizontal: 6,
    backgroundColor: "#FFF7CC",
    borderRadius: 6,
    alignItems: "center",
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 4,
    color: "#B45309",
  },
  restaurantCategory: {
    fontSize: 12,
    color: "#6B7280",
    marginVertical: 4,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeText: { fontSize: 12, color: "#6B7280" },
});
