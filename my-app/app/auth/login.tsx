import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useSignIn, useUser } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { API_URL } from "@/lib/apiConfig";
import { useAuth } from "@/app/context/AuthContext"; // ✅ lấy login() từ context

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const { login, syncUserToStrapi } = useAuth(); // ✅ context sửa ở trên
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // 🧠 Đồng bộ Clerk user sang Strapi
  const syncWithStrapi = async (clerkUser: any) => {
    try {
      console.log("🔄 Syncing Clerk user → Strapi...");
      const res = await fetch(`${API_URL}/api/auth/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: clerkUser.emailAddresses[0].emailAddress,
          username: clerkUser.username || clerkUser.firstName || "user",
          provider: "clerk",
        }),
      });

      const data = await res.json();
      if (data?.user?.id) {
        console.log("✅ Synced user to Strapi:", data.user);

        // 🧩 Lưu user Strapi vào context để dùng toàn app
        await login(data.user);
      } else {
        console.warn("⚠️ Không nhận được user.id từ Strapi:", data);
        Alert.alert("Lỗi", "Không thể đồng bộ tài khoản với Strapi");
      }
    } catch (err) {
      console.error("❌ Sync Clerk → Strapi error:", err);
      Alert.alert("Lỗi", "Không thể kết nối đến Strapi");
    }
  };

  // ⚙️ Xử lý đăng nhập
  const onSignInPress = async () => {
    if (!isLoaded) return;

    try {
      setLoading(true);
      const signInAttempt = await signIn.create({
        identifier: emailAddress.trim(),
        password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        console.log("✅ Login Clerk thành công");

        // Clerk cần vài trăm ms để cập nhật user
        setTimeout(async () => {
          if (clerkUser) {
            await syncWithStrapi(clerkUser);
            router.replace("../(tabs)/index"); // ✅ điều hướng sau sync
          } else {
            console.warn("⚠️ Clerk user chưa load kịp");
            Alert.alert("Lỗi", "Không thể lấy thông tin người dùng.");
          }
        }, 800);
      } else {
        console.warn("⚠️ Clerk login chưa complete:", signInAttempt);
        Alert.alert("Lỗi", "Đăng nhập chưa hoàn tất.");
      }
    } catch (err: any) {
      console.error("❌ Clerk login error:", err);
      Alert.alert("Lỗi đăng nhập", err.errors?.[0]?.message || "Sai thông tin tài khoản.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đăng nhập</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        autoCapitalize="none"
        value={emailAddress}
        onChangeText={setEmailAddress}
      />

      <TextInput
        style={styles.input}
        placeholder="Mật khẩu"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={onSignInPress} disabled={loading}>
        <Text style={styles.buttonText}>
          {loading ? "Đang đăng nhập..." : "ĐĂNG NHẬP"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>
        Chưa có tài khoản?
        <Link href="./register" style={styles.link}> Đăng ký</Link>
      </Text>

      <Text style={[styles.footerText, { marginTop: 8 }]}>
        Quên mật khẩu?
        <Link href="./forgot" style={styles.link}> Khôi phục</Link>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D0D",
    padding: 24,
    justifyContent: "center",
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#1C1C1E",
    color: "#fff",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#FF6B00",
    paddingVertical: 16,
    borderRadius: 10,
    marginTop: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  footerText: {
    color: "#aaa",
    textAlign: "center",
    marginTop: 20,
  },
  link: {
    color: "#FF6B00",
    marginLeft: 4,
  },
});
