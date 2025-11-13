import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  Modal,
  Image,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

interface MenuItem {
  id: number;
  name: string;
  price: number;
  imageUri?: string;
  available: boolean;
}

export default function MenuManagerLocal() {
  const [menu, setMenu] = useState<MenuItem[]>([
    { id: 1, name: "Phở bò", price: 45000, available: true, imageUri: "" },
    { id: 2, name: "Cơm tấm", price: 40000, available: true, imageUri: "" },
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const [nameInput, setNameInput] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [imageUri, setImageUri] = useState("");

  const openAddModal = () => {
    setEditingItem(null);
    setNameInput("");
    setPriceInput("");
    setImageUri("");
    setModalVisible(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setNameInput(item.name);
    setPriceInput(item.price.toString());
    setImageUri(item.imageUri || "");
    setModalVisible(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const saveItem = () => {
    if (!nameInput || !priceInput) return Alert.alert("Vui lòng nhập đủ thông tin");

    if (editingItem) {
      setMenu((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? { ...item, name: nameInput, price: parseInt(priceInput), imageUri }
            : item
        )
      );
    } else {
      setMenu((prev) => [
        ...prev,
        { id: Date.now(), name: nameInput, price: parseInt(priceInput), imageUri, available: true },
      ]);
    }
    setModalVisible(false);
  };

  const toggleAvailability = (item: MenuItem) => {
    setMenu((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, available: !i.available } : i))
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🍲 Quản lý Menu</Text>
      <Pressable style={styles.addBtnMain} onPress={openAddModal}>
        <Text style={styles.addBtnText}>Thêm món mới</Text>
      </Pressable>

      <FlatList
        data={menu}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={[styles.menuCard, !item.available && { opacity: 0.5 }]}>
            {item.imageUri ? (
              <Image source={{ uri: item.imageUri }} style={styles.itemImage} />
            ) : (
              <View style={[styles.itemImage, { backgroundColor: "#eee" }]} />
            )}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>{item.price.toLocaleString()} đ</Text>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: item.available ? "#16a34a" : "#dc2626" },
                ]}
              >
                <Text style={styles.badgeText}>{item.available ? "Còn hàng" : "Hết hàng"}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <Pressable style={styles.editBtn} onPress={() => openEditModal(item)}>
                <Text style={styles.actionText}>Sửa</Text>
              </Pressable>
              <Pressable style={styles.deleteBtn} onPress={() => toggleAvailability(item)}>
                <Text style={styles.actionText}>{item.available ? "Ẩn" : "Hiện"}</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingItem ? "Sửa món" : "Thêm món"}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Tên món"
              value={nameInput}
              onChangeText={setNameInput}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Giá"
              keyboardType="numeric"
              value={priceInput}
              onChangeText={setPriceInput}
            />
            <Pressable style={styles.imageBtn} onPress={pickImage}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                {imageUri ? "Thay đổi ảnh" : "Chọn ảnh món"}
              </Text>
            </Pressable>
            {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} /> : null}
            <Pressable
              style={[styles.actionBtn, { backgroundColor: "#16a34a", marginTop: 8 }]}
              onPress={saveItem}
            >
              <Text style={styles.actionText}>Lưu</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: "#9ca3af", marginTop: 8 }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.actionText}>Hủy</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f9fafb" },
  title: { fontSize: 22, fontWeight: "700", color: "#f97316", marginBottom: 16 },
  addBtnMain: { backgroundColor: "#f97316", paddingVertical: 10, borderRadius: 8, marginBottom: 16, alignItems: "center" },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  menuCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#fff",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  itemImage: { width: 80, height: 80, borderRadius: 8 },
  itemName: { fontSize: 16, fontWeight: "700", color: "#1f2937" },
  itemPrice: { fontSize: 14, color: "#16a34a", marginTop: 4 },
  badge: { marginTop: 6, alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  editBtn: { backgroundColor: "#f97316", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  deleteBtn: { backgroundColor: "#dc2626", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  actionText: { color: "#fff", fontWeight: "600", fontSize: 12 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "#fff", borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  modalInput: { borderWidth: 1, borderColor: "#fed7aa", borderRadius: 8, padding: 8, marginBottom: 12 },
  imageBtn: { backgroundColor: "#f97316", padding: 10, borderRadius: 8, alignItems: "center" },
  previewImage: { width: 140, height: 140, borderRadius: 8, marginTop: 12, alignSelf: "center" },
  actionBtn: { paddingVertical: 10, borderRadius: 6, alignItems: "center" },
});
