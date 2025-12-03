import React, { useRef } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";

export default function DroneTestNative({ order }: { order: any }) {
  const webviewRef = useRef<WebView>(null);

  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webviewRef}
        style={{ flex: 1 }}
        originWhitelist={["*"]}
        source={require("../../assets/map.html")} 
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowUniversalAccessFromFileURLs
        mixedContentMode="always"
        onLoad={() => {
          if (!webviewRef.current) return;

          webviewRef.current.postMessage(
            JSON.stringify({
              orderId: order?.id,
              restaurant: order?.restaurant?.location,
              customer: order?.customerLocation,
              statusOrder: order?.statusOrder,
              route: order?.route,
              apiUrl: process.env.EXPO_PUBLIC_STRAPI_URL,
            })
          );
        }}
      />
    </View>
  );
}
