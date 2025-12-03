import React, { useEffect, useRef, useState } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import io, { Socket } from "socket.io-client";
import "maplibre-gl/dist/maplibre-gl.css";

type LatLng = {
  lat: number;
  lng: number;
};

type OrderType = {
  statusOrder: string;
  restaurant?: { location: LatLng };
  customerLocation?: LatLng;
  route?: { lat: number; lng: number }[];
};

type DroneTestProps = {
  orderId: string;
  order: OrderType;
};

export default function DroneTestWeb({ orderId, order }: DroneTestProps) {
  const warehouse: LatLng = { lat: 10.760596, lng: 106.681948 };
  const restaurant = order?.restaurant?.location || null;
  const customer = order?.customerLocation || null;

  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [routeHistory, setRouteHistory] = useState<[number, number][]>([]);

  const socketRef = useRef<Socket | null>(null);

  const initialCenter = {
    longitude: restaurant?.lng ?? warehouse.lng,
    latitude: restaurant?.lat ?? warehouse.lat,
    zoom: 13,
  };

  // ============================================================
  // TRIGGER DRONE KHI STATUS = READY
  // ============================================================
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (!orderId || !order) return;

    if (order.statusOrder === "ready" && !triggeredRef.current) {
      triggeredRef.current = true;

      fetch(
        `${process.env.EXPO_PUBLIC_STRAPI_URL}/api/orders/trigger-drone/${orderId}`,
        { method: "POST" }
      ).catch(console.log);

      setCoords(null);
      setRouteHistory([]);
    }
  }, [order?.statusOrder, orderId, order]);

  // ============================================================
  // SOCKET.IO
  // ============================================================
  useEffect(() => {
    if (!orderId) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(process.env.EXPO_PUBLIC_STRAPI_URL!, {
      transports: ["websocket"],
      path: "/socket.io/",
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🟢 WS CONNECT:", socket.id);
      socket.emit("drone:join", orderId);
    });

    socket.on("drone:position", (data: any) => {
      if (String(data.orderID) !== String(orderId)) return;

      const p: [number, number] = [data.lng, data.lat];
      setCoords(p);
      setRouteHistory((prev) => [...prev, p]);
    });

    socket.on("disconnect", () => console.log("🔴 WS DISCONNECTED"));

    return () => {
      socket.disconnect();
    };
  }, [orderId]);

  // ============================================================
  // LOAD ROUTE TRONG DB KHI DELIVERED
  // ============================================================
  useEffect(() => {
    if (!order) return;

    if (order.statusOrder === "delivered" && Array.isArray(order.route)) {
      const saved: [number, number][] = order.route.map((p: any) => [
        p.lng,
        p.lat,
      ]);
      setRouteHistory(saved);

      if (saved.length > 0) {
        setCoords(saved[saved.length - 1]);
      }
    }
  }, [order]);

  // ============================================================
  // CHECK TRẠNG THÁI BAY
  // ============================================================
  const isFlying =
    order?.statusOrder === "ready" ||
    order?.statusOrder === "delivering" ||
    order?.statusOrder === "delivered";

  // ============================================================
  // HÀM TÍNH KHOẢNG CÁCH (KM)
  // ============================================================
  function haversineDistance(p1: LatLng, p2: LatLng): number {
    const R = 6371;
    const dLat = (p2.lat - p1.lat) * (Math.PI / 180);
    const dLng = (p2.lng - p1.lng) * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(p1.lat * (Math.PI / 180)) *
        Math.cos(p2.lat * (Math.PI / 180)) *
        Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const distanceWarehouseToRes = restaurant
    ? haversineDistance(warehouse, restaurant)
    : 0;

  const distanceResToCustomer = restaurant && customer
    ? haversineDistance(restaurant, customer)
    : 0;

  const totalDistance =
    distanceWarehouseToRes + distanceResToCustomer;

  // ============================================================
  // REALTIME DISTANCES
  // ============================================================
  const [distanceDroneToRestaurant, setDistanceDroneToRestaurant] = useState(0);
  const [distanceDroneToCustomer, setDistanceDroneToCustomer] = useState(0);
  const [distanceTraveled, setDistanceTraveled] = useState(0);

  useEffect(() => {
    if (!coords) return;

    // 🔵 Tổng km đã bay dựa trên routeHistory → realtime
    if (routeHistory.length > 1) {
      let sum = 0;
      for (let i = 1; i < routeHistory.length; i++) {
        const p1 = { lat: routeHistory[i - 1][1], lng: routeHistory[i - 1][0] };
        const p2 = { lat: routeHistory[i][1], lng: routeHistory[i][0] };
        sum += haversineDistance(p1, p2);
      }
      setDistanceTraveled(sum);
    }

    // 🔵 Drone → Restaurant
    if (restaurant) {
      setDistanceDroneToRestaurant(
        haversineDistance(
          { lat: coords[1], lng: coords[0] },
          restaurant
        )
      );
    }

    // 🔵 Drone → Customer
    if (customer) {
      setDistanceDroneToCustomer(
        haversineDistance(
          { lat: coords[1], lng: coords[0] },
          customer
        )
      );
    }
  }, [coords, routeHistory]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      {/* Panel hiển thị khoảng cách */}
      <div
        style={{
          position: "absolute",
          zIndex: 10,
          top: 10,
          left: 10,
          background: "white",
          padding: 12,
          borderRadius: 8,
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          lineHeight: "20px",
          fontSize: 14,
          fontWeight: 600,
          minWidth: 250,
        }}
      >
        <div>🛫 Đã bay: {distanceTraveled.toFixed(2)} km</div>
        <div>🛸 Cách Restaurant: {distanceDroneToRestaurant.toFixed(2)} km</div>
        <div>🎯 Cách Customer: {distanceDroneToCustomer.toFixed(2)} km</div>
        <div>
          🚀 Còn lại:{" "}
          {(distanceDroneToRestaurant + distanceDroneToCustomer).toFixed(2)} km
        </div>
      </div>

      <Map
        mapLib={maplibregl}
        initialViewState={initialCenter}
        style={{ width: "100%", height: "100%" }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      >
        {/* Warehouse */}
        <Marker longitude={warehouse.lng} latitude={warehouse.lat}>
          <MarkerLabel color="#0066ff" label="Warehouse" size={16} />
        </Marker>

        {/* Restaurant */}
        {restaurant && (
          <Marker longitude={restaurant.lng} latitude={restaurant.lat}>
            <MarkerLabel color="#00c853" label="Restaurant" size={16} />
          </Marker>
        )}

        {/* Customer */}
        {customer && (
          <Marker longitude={customer.lng} latitude={customer.lat}>
            <MarkerLabel color="#ff1744" label="Customer" size={16} />
          </Marker>
        )}

        {/* Path */}
        {isFlying && routeHistory.length > 1 && (
          <Source
            id="route"
            type="geojson"
            data={{
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: routeHistory,
              },
            }}
          >
            <Layer
              id="route-line"
              type="line"
              paint={{ "line-color": "#ff6600", "line-width": 4 }}
            />
          </Source>
        )}

        {/* Drone */}
        {isFlying && coords && (
          <Marker longitude={coords[0]} latitude={coords[1]}>
            <MarkerLabel color="orange" label="Drone" size={20} />
          </Marker>
        )}
      </Map>
    </div>
  );
}

// ======================================================
// MARKER LABEL COMPONENT
// ======================================================
type MarkerLabelProps = {
  label: string;
  color: string;
  size?: number;
};

function MarkerLabel({ color, label, size = 16 }: MarkerLabelProps) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: size,
          height: size,
          background: color,
          borderRadius: "50%",
          border: "2px solid #fff",
          margin: "0 auto",
        }}
      />
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          background: "rgba(255,255,255,0.8)",
          padding: "2px 6px",
          borderRadius: 6,
          display: "inline-block",
          marginTop: 3,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </div>
  );
}
