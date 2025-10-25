import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function Onboarding1() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Image source={require("../../assets/images/react-logo.png")} style={styles.image} />
      <Text style={styles.title}>All your favorites</Text>
      <Text style={styles.subtitle}>Get all your loved foods in one place...</Text>

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => router.push("/onboarding/step2")} style={styles.button}>
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace("/auth/login")}>
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", padding: 24 },
  image: { width: 260, height: 260, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "700", color: "#333" },
  subtitle: { fontSize: 14, color: "#888", textAlign: "center", marginVertical: 10 },
  footer: { marginTop: 30, alignItems: "center" },
  button: { backgroundColor: "#FF7A00", paddingVertical: 12, paddingHorizontal: 40, borderRadius: 30 },
  buttonText: { color: "#fff", fontWeight: "600" },
  skip: { color: "#999", marginTop: 10 },
});
