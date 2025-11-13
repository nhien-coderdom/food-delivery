import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";

export default function InfoScreen() {
  const [name, setName] = useState("Nhà hàng Ẩm Thực Việt");
  const [address, setAddress] = useState("123 Đường ABC, Quận 1, TP.HCM");
  const [phone, setPhone] = useState("0909 123 456");
  const [email, setEmail] = useState("info@amthucviet.com");

  const handleSave = () => {
    Alert.alert("✅ Đã lưu", "Thông tin nhà hàng đã được cập nhật!");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏪 Thông tin nhà hàng</Text>

      <Text style={styles.label}>Tên nhà hàng</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>Địa chỉ</Text>
      <TextInput style={styles.input} value={address} onChangeText={setAddress} />

      <Text style={styles.label}>Số điện thoại</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} />

      <Text style={styles.label}>Email</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} />

      <Pressable style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveText}>Lưu thay đổi</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24 },
  title: { fontSize: 20, fontWeight: "700", color: "#f97316", marginBottom: 16 },
  label: { fontSize: 15, color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#fed7aa",
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  saveBtn: {
    backgroundColor: "#fb923c",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontWeight: "700" },
});
