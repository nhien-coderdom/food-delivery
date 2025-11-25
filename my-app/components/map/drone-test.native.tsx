// D:\food-delivery\my-app\components\map\drone-test.native.tsx
import React from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";

interface DroneTestNativeProps {
  orderId: string;
}

export default function DroneTestNative({ orderId }: DroneTestNativeProps) {
  return (
    <View style={{ flex: 1 }}>
      <WebView
        style={{ flex: 1 }}
        source={require("../../assets/map.html")}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowUniversalAccessFromFileURLs
        mixedContentMode="always"
      />
    </View>
  );
}
