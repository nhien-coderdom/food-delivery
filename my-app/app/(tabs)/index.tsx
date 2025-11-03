import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import RestaurantList from "../../components/RestaurantList";
import DeliverTo from "@/components/DeliverTo";
import { useCart } from "@/app/context/CartContext";
import { Link, Href } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { shadows } from "@/lib/shadowStyles";
import { API_URL } from "@/lib/apiConfig";

export default function HomePage() {
  const { user } = useUser();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // ✅ Category state (lấy từ Strapi)
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch(`${API_URL}/api/categories`);
        const json = await res.json();

        console.log("📦 Categories from Strapi:", json);

        const formatted = json.data.map((c: any) => ({
          id: c.documentId,
          name: c.Name || c.name,
          icon: c.icon || "fast-food-outline",
        }));

        // ✅ Add "All" manually
        setCategories([{ id: "all", name: "All", icon: "flame" }, ...formatted]);
      } catch (e) {
        console.log("❌ Fetch categories error:", e);
      } finally {
        setLoadingCategories(false);
      }
    }

    fetchCategories();
  }, []);

  const firstName =
    user?.firstName ||
    user?.username ||
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    "Friend";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const { itemCount } = useCart();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <DeliverTo />
          </View>

          <Link href={("/cart" as Href)} asChild>
            <TouchableOpacity style={styles.profileButton}>
              {itemCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{itemCount}</Text>
                </View>
              )}
              <Ionicons name="cart" size={28} color="#1F2937" />
            </TouchableOpacity>
          </Link>
        </View>

        <Text style={styles.greeting}>
          Hi {firstName}, {getGreeting()}! 👋
        </Text>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            placeholder="Search dishes, restaurants"
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Categories */}
        <View style={styles.categoriesHeader}>
          <Text style={styles.sectionTitle}>All Categories</Text>
          <Pressable><Text style={styles.seeAll}>See All →</Text></Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
        >
          {loadingCategories ? (
            <Text style={{ color: "#999" }}>Loading...</Text>
          ) : (
            categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryButton,
                  selectedCategory === cat.id && styles.categoryButtonActive,
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Ionicons
                  name={cat.icon}
                  size={24}
                  color={selectedCategory === cat.id ? "#FFF" : "#FF6B35"}
                />
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === cat.id && styles.categoryTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      {/* Restaurants */}
      <View style={styles.restaurantsHeader}>
        <Text style={styles.sectionTitle}>Open Restaurants</Text>
        <Pressable><Text style={styles.seeAll}>See All →</Text></Pressable>
      </View>

      <RestaurantList query={query} category={selectedCategory} />
    </ScrollView>
  );
}

/* ✅ Styles giữ nguyên */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  header: {
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...shadows.small,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  profileButton: { width: 40, height: 40, justifyContent: "center", alignItems: "center", position: "relative" },
  badge: {
    position: "absolute",
    top: -4, right: -4,
    backgroundColor: "#FF6B35",
    borderRadius: 10,
    width: 20, height: 20,
    justifyContent: "center", alignItems: "center", zIndex: 1,
  },
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "700" },
  greeting: { fontSize: 16, fontWeight: "400", color: "#1F2937", marginBottom: 20 },
  searchContainer: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F3F4F6", borderRadius: 12,
    paddingHorizontal: 16, height: 50, marginBottom: 24,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: "#1F2937" },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#1F2937" },
  seeAll: { fontSize: 14, color: "#FF6B35", fontWeight: "600" },
  categoriesHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 16,
  },
  categoriesScroll: { marginHorizontal: -20, paddingHorizontal: 20, marginBottom: 8 },
  categoryButton: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 12, marginRight: 12,
    borderWidth: 1, borderColor: "#FF6B35",
  },
  categoryButtonActive: { backgroundColor: "#FF6B35", borderColor: "#FF6B35" },
  categoryText: { marginLeft: 8, fontSize: 14, fontWeight: "600", color: "#FF6B35" },
  categoryTextActive: { color: "#FFF" },
  restaurantsHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 20,
    paddingTop: 24, paddingBottom: 16,
  },
});
