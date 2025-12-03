// D:\food-delivery\my-app\components\map\drone-test.web.tsx

import React, { useEffect, useState } from "react";
import Map, { Marker } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import io from "socket.io-client";

interface Props {
  orderId: string;
  order: any; // 👈 thêm order vào props
}

export default function DroneTestWeb({ orderId, order }: Props) {
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [finished, setFinished] = useState(false);

  // ==========================
  // LẤY DỮ LIỆU MARKER TỪ ORDER
  // ==========================
  const warehouse = { lat: 10.8001, lng: 106.7002 }; // giống backend simulator
  const restaurant = order?.restaurant?.location;
  const customer = order?.customerLocation;
console.log("🚁 DroneTestWeb order:", order);
console.log("🚁 DroneTestWeb restaurant:", restaurant);
console.log("🚁 DroneTestWeb customer:", customer);
  // ==========================
  // SOCKET.IO
  // ==========================
  useEffect(() => {
    const backendUrl =
      process.env.EXPO_PUBLIC_STRAPI_URL || "http://172.20.10.3:1337";

    const socket = io(backendUrl, {
      transports: ["websocket"],
      path: "/socket.io/",
    });

    socket.on("connect", () => {
      console.log("🟢 DroneTestWeb connected:", socket.id);

      // JOIN ROOM
      socket.emit("drone:join", orderId);
    });

    socket.on("drone:position", (data: any) => {
      const incomingId = String(
        data.orderID ?? data.orderId ?? data.order_id ?? ""
      );
      if (incomingId !== String(orderId)) return;

      setCoords([data.lng, data.lat]);
    });

    socket.on("drone:done", (data: any) => {
      const incomingId = String(
        data.orderID ?? data.orderId ?? data.order_id ?? ""
      );
      if (incomingId !== String(orderId)) return;

      setFinished(true);
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId]);

  // ==========================
  // RENDER
  // ==========================
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Map
        mapLib={maplibregl}
        initialViewState={{
          longitude: restaurant?.lng ?? 106.7,
          latitude: restaurant?.lat ?? 10.77,
          zoom: 13,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      >

        {/* 🟦 WAREHOUSE */}
        <Marker
          longitude={warehouse.lng}
          latitude={warehouse.lat}
          color="blue"
        />

        {/* 🟩 RESTAURANT */}
        {restaurant && (
          <Marker
            longitude={restaurant.lng}
            latitude={restaurant.lat}
            color="green"
          />
        )}

        {/* 🟥 CUSTOMER */}
        {customer && (
          <Marker
            longitude={customer.lng}
            latitude={customer.lat}
            color="red"
          />
        )}

        {/* 🟧 DRONE REALTIME */}
        {coords && (
          <Marker longitude={coords[0]} latitude={coords[1]} color="orange" />
        )}
      </Map>

      {/* DISPLAY STATUS BOX */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          background: "white",
          padding: 10,
          borderRadius: 8,
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
        }}
      >
        <h3>🚁 Drone Tracking</h3>
        {finished ? <p>✔ Hoàn thành</p> : <p>📍 Drone đang di chuyển…</p>}
      </div>
    </div>
  );
}
