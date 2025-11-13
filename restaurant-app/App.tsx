import * as React from "react";
import { Provider as PaperProvider } from "react-native-paper";
import { AuthProvider } from "./hooks/useAuth";
import AppContent from "./app/AppContent";

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
