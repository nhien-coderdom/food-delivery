// D:\food-delivery\my-app\components\map\drone-test.tsx

import React from "react";
import { Platform } from "react-native";

import DroneTestWeb from "../drone-test-web";
import DroneTestNative from "./drone-test.native";

interface DroneTestProps {
  orderId: string;
  order: any;    
}

export default function DroneTest(props: DroneTestProps) {
  console.log("🔥 DroneTest props:", props);

  if (Platform.OS === "web") {
    return <DroneTestWeb {...props} />;  // 👈 TRUYỀN ORDER
  }

  return <DroneTestNative {...props} />;
}
