import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface Props {
  username: string;
}

export default function Header({ username }: Props) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>HỆ THỐNG QUẢN LÝ NHÀ HÀNG</Text>
      
      <View style={styles.subHeader}>
        <Text style={styles.greeting}>Xin chào</Text>
        <Text style={styles.username}>{username}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f97316",
    backgroundColor: "#fff",
    width: "100%",            
    alignItems: "center",     
    justifyContent: "center", 
    gap: 8,                   
  },
  
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f97316",
    textAlign: "center",      
    textTransform: "uppercase" 
  },

  subHeader: { 
    flexDirection: "row",     
    alignItems: "center", 
    gap: 6 
  },

  greeting: { 
    fontSize: 14, 
    color: "#374151" 
  },
  
  username: { 
    fontSize: 14, 
    fontWeight: "700", 
    color: "#059669" 
  },
});