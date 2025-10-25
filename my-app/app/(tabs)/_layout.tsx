import { View } from "react-native";
import { Tabs } from "expo-router";
import Navbar from "../../components/Navigation";

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Navbar />

      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="orders" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </View>
  );
}
