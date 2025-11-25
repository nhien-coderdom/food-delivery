import React, { useEffect, useState } from "react";
import Map, { Marker } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import io from "socket.io-client";

interface Props {
  orderId: string;
  order: any;
}

export default function DroneTestWeb({ orderId, order }: Props) {
  const [coords, setCoords] = useState<[number, number] | null>(null);

  // Lấy vị trí từ order
  const warehouse = { lat: 10.760596, lng: 106.681948 }; 
  const restaurant = order?.restaurant?.location;
  const customer = order?.customerLocation;

  // Socket nhận realtime
  useEffect(() => {
    if (!orderId) return;

    const socket = io(process.env.EXPO_PUBLIC_STRAPI_URL!, {
      transports: ["websocket", "polling"],
      path: "/socket.io/",
    });

    socket.on("connect", () => {
      console.log("🟢 DroneTestWeb connected:", socket.id);

      socket.emit("drone:join", orderId);
    });

    socket.on("drone:position", (data) => {
      if (String(data.orderID) !== String(orderId)) return;

      console.log("📍 Drone received:", data);
      setCoords([data.lng, data.lat]);
    });

    socket.on("drone:done", () => {
      console.log("🏁 Drone finished");
    });

    return () => { socket.disconnect(); };
  }, [orderId]);


  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Map
        mapLib={maplibregl}
        initialViewState={{
          longitude: restaurant?.lng ?? "",
          latitude: restaurant?.lat ?? "",
          zoom: 13,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      >

        {/* MARKER KHO */}
        {warehouse && (
          <Marker longitude={warehouse.lng} latitude={warehouse.lat} color="blue" />
        )}

        {/* MARKER NHÀ HÀNG */}
        {restaurant && (
          <Marker longitude={restaurant.lng} latitude={restaurant.lat} color="green" />
        )}

        {/* MARKER KHÁCH */}
        {customer && (
          <Marker longitude={customer.lng} latitude={customer.lat} color="red" />
        )}

        {/* MARKER DRONE (REALTIME) */}
        {coords && (
          <Marker longitude={coords[0]} latitude={coords[1]} color="orange" />
        )}
      </Map>
    </div>
  );
}
