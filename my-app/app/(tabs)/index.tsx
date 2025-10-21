import { useState } from "react";
import { View, TextInput, StyleSheet, ScrollView } from "react-native";
import RestaurantList from "../../components/RestaurantList";

export default function HomePage() {
  const [query, setQuery] = useState("");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextInput
        placeholder="Search restaurants..."
        value={query}
        onChangeText={setQuery}
        style={styles.input}
        placeholderTextColor="#9ca3af"
      />
      <RestaurantList query={query} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 40,
    backgroundColor: "#fff",
  },
  input: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
  },
});
