import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StatusBar, 
  StyleSheet,
  Alert 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";

export default function LoginScreen() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await login(identifier, password);
    } catch (err: any) {
      const errorMessage = err?.message || "Đăng nhập thất bại, vui lòng thử lại.";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />
      
      <View style={styles.container}>
        <Text style={styles.title}>Đăng nhập quản trị</Text>
        <TextInput
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="Email hoặc tên đăng nhập"
          placeholderTextColor="#aaa"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Mật khẩu"
          placeholderTextColor="#aaa"
          secureTextEntry
          style={styles.input}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, submitting && styles.disabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>
            {submitting ? "Đang xử lý..." : "Đăng nhập"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Liên hệ admin hệ thống nếu quên mật khẩu.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: "#0D0D0D", 
    justifyContent: "center", 
    paddingHorizontal: 24 
  },
  container: {
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#2A2A2C",
    gap: 12,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  title: { 
    fontSize: 22, 
    fontWeight: "800", 
    color: "#fff", 
    textAlign: "center", 
    marginBottom: 8 
  },
  input: { 
    backgroundColor: "#2C2C2E", 
    color: "#fff", 
    borderRadius: 10, 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    fontSize: 16 
  },
  button: { 
    backgroundColor: "#f97316", 
    paddingVertical: 14, 
    borderRadius: 10, 
    alignItems: "center",
    marginTop: 4
  },
  buttonText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "700" 
  },
  errorText: { 
    color: "#ef4444", 
    fontSize: 14, 
    textAlign: "center" 
  },
  hint: { 
    color: "#9ca3af", 
    textAlign: "center", 
    marginTop: 8, 
    fontSize: 13 
  },
  disabled: { 
    opacity: 0.6 
  },
});