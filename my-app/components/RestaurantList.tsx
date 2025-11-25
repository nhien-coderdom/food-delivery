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

interface Restaurant {
  id: number;
  documentId: string;
  name: string;
  image?: { url: string };
  categories?: Category[];
}

interface RestaurantListProps {
  query?: string;
  category?: string;
}

const getNumColumns = () => {
  const { width } = Dimensions.get("window");
  if (width > 1200) return 4;
  if (width > 768) return 3;
  return 2;
};

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
  `${API_URL}/api/restaurants?populate[image]=true&populate[dishes]=true&populate[categories]=true`,
  {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  }
);

        const json = await res.json();
        console.log("✅ Fetched restaurants:", json);
        setRestaurants(Array.isArray(json.data) ? json.data : []);
      } catch (err: any) {
        console.error("❌ Error fetching restaurants:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

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

  // ✅ New filter logic (query + category)
  const filtered = restaurants.filter((r) => {
    // match name search
    const matchQuery = r?.name?.toLowerCase().includes(query.toLowerCase());

    // if no category filter or "all"
    if (category === "all") return matchQuery;

    // ✅ match category (by documentId or name)
    const matchCategory = r?.categories?.some(
      (c) =>
        c.documentId === category ||
        c.name?.toLowerCase() === category.toLowerCase()
    );

    return matchQuery && matchCategory;
  });

  if (!filtered.length)
    return (
      <View style={styles.center}>
        <Ionicons name="search-outline" size={60} color="#CCC" />
        <Text style={styles.emptyText}>No restaurants match your filter</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      {filtered.map((res) => {
        const imgUrl = getImageUrl(res?.image?.url);
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

                <Text style={styles.restaurantCategory}>
                  {res?.categories?.map((c) => c?.name).join(" • ") ||
                    "No category"}
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
      web: "calc(33.3% - 10px)",
      default: "100%",
    }) as any,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    ...shadows.card,
  },
  cardImage: {
    width: "100%",
    height: Platform.select({ web: 160, default: 200 }) as number,
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
