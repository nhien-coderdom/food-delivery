import { Stack } from "expo-router";
import { View, StyleSheet } from "react-native";
import Navigation from "../components/Navigation";

export default function RootLayout() {
  return (
    <View style={styles.container}>
      <Navigation />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
