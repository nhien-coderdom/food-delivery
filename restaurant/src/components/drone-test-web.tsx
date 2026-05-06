// DroneTestWeb.tsx
import { useEffect, useRef, useState } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import io, { Socket } from "socket.io-client";
import "maplibre-gl/dist/maplibre-gl.css";

type LatLng = {
  lat: number;
  lng: number;
};

type DroneTestProps = {
  orderId: string;
  order: {
    statusOrder: string;
    restaurant: {
      location?: {
        lat?: number;
        lng?: number;
      } | null;
    };
    customerLocation?: {
      lat?: number;
      lng?: number;
    } | null;
    // route can be stored various ways — we accept array of [number, number] in either (lat,lng) or (lng,lat)
    route?: Array<[number, number]> | null;
  };
  onClose?: () => void;
  // optional mode forcing: "realtime" | "history" | undefined
  mode?: "realtime" | "history";
};

export default function DroneTestWeb({ orderId, order, onClose, mode }: DroneTestProps) {
  // fallback warehouse (used for info only)
  const warehouse: LatLng = { lat: 10.760596, lng: 106.681948 };

  const restaurant = order?.restaurant?.location ?? null;
  const customer = order?.customerLocation ?? null;

  const [coords, setCoords] = useState<[number, number] | null>(null); // [lng, lat]
  const [routeHistory, setRouteHistory] = useState<[number, number][]>([]); // array of [lng, lat]

  const socketRef = useRef<Socket | null>(null);
  const triggeredRef = useRef(false);

  // ---------- helpers ----------
  const isValidLng = (v: unknown) => typeof v === "number" && v >= -180 && v <= 180;
  const isValidLat = (v: unknown) => typeof v === "number" && v >= -90 && v <= 90;

  function isValidPoint(p?: [number, number] | null) {
    if (!p) return false;
    const [a, b] = p;
    // treat p as [lng, lat]
    return isValidLng(a) && isValidLat(b);
  }

  // route element may be [lat, lng] or [lng, lat] — normalize to [lng, lat]
  function normalizeRoutePoint(p: [number, number]): [number, number] | null {
    const [x, y] = p;
    // if looks like (lat, lng)
    if (isValidLat(x) && isValidLng(y)) {
      // convert to [lng, lat]
      return [y, x];
    }
    // if looks like (lng, lat)
    if (isValidLng(x) && isValidLat(y)) {
      return [x, y];
    }
    return null;
  }

  function parseRoute(raw?: Array<[number, number]> | null) {
    if (!Array.isArray(raw)) return [];
    const out: [number, number][] = [];
    for (const p of raw) {
      if (!Array.isArray(p) || p.length < 2) continue;
      const norm = normalizeRoutePoint([p[0], p[1]]);
      if (norm) out.push(norm);
    }
    return out;
  }

  // compute bounding box and center
  function computeCenter(points: [number, number][]) {
    if (!points || points.length === 0) return { longitude: warehouse.lng, latitude: warehouse.lat };
    let minX = points[0][0], maxX = points[0][0], minY = points[0][1], maxY = points[0][1];
    points.forEach(([lng, lat]) => {
      if (lng < minX) minX = lng;
      if (lng > maxX) maxX = lng;
      if (lat < minY) minY = lat;
      if (lat > maxY) maxY = lat;
    });
    return { longitude: (minX + maxX) / 2, latitude: (minY + maxY) / 2, bbox: [minX, minY, maxX, maxY] as [number, number, number, number] };
  }

  // ---------- trigger drone endpoint (best-effort) ----------
  useEffect(() => {
    if (!orderId || !order) return;

    // original code triggered on "ready" — keep best-effort but guard with ref so we don't retry repeatedly
    if ((order.statusOrder === "ready" || order.statusOrder === "delivering") && !triggeredRef.current) {
      triggeredRef.current = true;

      const base = import.meta.env.VITE_STRAPI_URL ?? "";
      if (base) {
        const url = `${base.replace(/\/$/, "")}/api/orders/trigger-drone/${orderId}`;
        fetch(url, { method: "POST" }).then((res) => {
          console.log("[DroneTestWeb] trigger-drone response", res.status);
        }).catch((e) => {
          console.warn("[DroneTestWeb] trigger-drone error", e);
        });
      } else {
        console.warn("[DroneTestWeb] VITE_STRAPI_URL not set, cannot call trigger-drone");
      }

      // reset local coords/route
      setCoords(null);
      setRouteHistory([]);
    }
  }, [order?.statusOrder, orderId, order]);

  // ---------- parse saved route when order changes ----------
  useEffect(() => {
    const parsed = parseRoute(order?.route ?? null);
    if (parsed.length > 0) {
      setRouteHistory(parsed);
      setCoords(parsed[parsed.length - 1]); // last point
    } else {
      // don't blow away routeHistory if realtime updates already coming
      // but if order's route explicitly empty, clear
      setRouteHistory((prev) => (order?.route ? parsed : prev));
    }
  }, [order?.route]);

  // ---------- socket realtime (only for realtime mode) ----------
  useEffect(() => {
    const wantRealtime = mode === "realtime" ? true : (mode === "history" ? false : order?.statusOrder === "delivering");

    if (!orderId || !wantRealtime) {
      return;
    }

    // cleanup existing socket if any
    if (socketRef.current) {
      socketRef.current.off();
      try {
        socketRef.current.disconnect();
      } catch (e) {
        // ignore
      }
      socketRef.current = null;
    }

    const base = import.meta.env.VITE_STRAPI_URL ?? "";
    if (!base) {
      console.warn("[DroneTestWeb] VITE_STRAPI_URL not set — cannot open socket");
      return;
    }

    // Ensure base is an http url; socket.io-client will pick websocket transport automatically.
    const socketUrl = base.replace(/\/+$/, "");
    console.log("[DroneTestWeb] connecting socket to", socketUrl);

    const socket = io(socketUrl, {
      transports: ["websocket"],
      path: "/socket.io/",
      // autoConnect: true
    });

    socketRef.current = socket;

    const onConnect = () => {
      console.log("[DroneTestWeb] socket connected", socket.id);
      // join the room for this order
      socket.emit("drone:join", orderId);
    };

    const onPosition = (data: any) => {
      // expected payload: { orderID, lat, lng }
      if (!data) return;
      if (String(data.orderID) !== String(orderId)) return;

      const lat = Number(data.lat);
      const lng = Number(data.lng);
      if (!isValidLat(lat) || !isValidLng(lng)) {
        console.warn("[DroneTestWeb] invalid position from socket", data);
        return;
      }
      const p: [number, number] = [lng, lat];
      setCoords(p);
      setRouteHistory((prev) => {
        // avoid appending duplicates if same as last
        const last = prev.length > 0 ? prev[prev.length - 1] : null;
        if (last && Math.abs(last[0] - p[0]) < 1e-6 && Math.abs(last[1] - p[1]) < 1e-6) {
          return prev;
        }
        return [...prev, p];
      });
    };

    const onArrived = (data: any) => {
      if (String(data?.orderID) !== String(orderId)) return;
      console.log("[DroneTestWeb] drone arrived for order", orderId, data);
      // optionally show toast or handle UI; but we don't force-close
    };

    const onDisconnect = (reason: string) => {
      console.log("[DroneTestWeb] socket disconnected:", reason);
    };

    socket.on("connect", onConnect);
    socket.on("drone:position", onPosition);
    socket.on("drone:arrived", onArrived);
    socket.on("disconnect", onDisconnect);

    // cleanup
    return () => {
      try {
        socket.off("connect", onConnect);
        socket.off("drone:position", onPosition);
        socket.off("drone:arrived", onArrived);
        socket.off("disconnect", onDisconnect);
      } catch (e) {}
      try {
        socket.disconnect();
      } catch (e) {}
      socketRef.current = null;
    };
  }, [orderId, order?.statusOrder, mode]);

  // ---------- distance calculations ----------
  function haversineDistance(p1: LatLng, p2: LatLng) {
    const R = 6371; // km
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(p2.lat - p1.lat);
    const dLng = toRad(p2.lng - p1.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const distanceWarehouseToRes = restaurant && isValidLat(restaurant.lat) && isValidLng(restaurant.lng)
    ? haversineDistance(warehouse, { lat: restaurant.lat!, lng: restaurant.lng! })
    : 0;
  const distanceResToCustomer = (restaurant && customer && isValidLat(customer.lat) && isValidLng(customer.lng))
    ? haversineDistance({ lat: restaurant.lat!, lng: restaurant.lng! }, { lat: customer.lat!, lng: customer.lng! })
    : 0;

  const totalDistance = distanceWarehouseToRes + distanceResToCustomer;

  const [distanceDroneToRestaurant, setDistanceDroneToRestaurant] = useState(0);
  const [distanceDroneToCustomer, setDistanceDroneToCustomer] = useState(0);
  const [distanceTraveled, setDistanceTraveled] = useState(0);

  useEffect(() => {
    if (!coords) return;
    if (routeHistory.length > 1) {
      let sum = 0;
      for (let i = 1; i < routeHistory.length; i++) {
        const p1 = { lng: routeHistory[i - 1][0], lat: routeHistory[i - 1][1] };
        const p2 = { lng: routeHistory[i][0], lat: routeHistory[i][1] };
        sum += haversineDistance({ lat: p1.lat, lng: p1.lng }, { lat: p2.lat, lng: p2.lng });
      }
      setDistanceTraveled(sum);
    }

    if (restaurant && isValidLat(restaurant.lat) && isValidLng(restaurant.lng)) {
      setDistanceDroneToRestaurant(haversineDistance({ lat: coords[1], lng: coords[0] }, { lat: restaurant.lat!, lng: restaurant.lng! }));
    }
    if (customer && isValidLat(customer.lat) && isValidLng(customer.lng)) {
      setDistanceDroneToCustomer(haversineDistance({ lat: coords[1], lng: coords[0] }, { lat: customer.lat!, lng: customer.lng! }));
    }
  }, [coords, routeHistory, restaurant, customer]);

  // ---------- rendering decisions ----------
  const hasValidRoute = routeHistory.length >= 2 && routeHistory.every(isValidPoint);
  const isRealtimeMode = mode ? mode === "realtime" : order?.statusOrder === "delivering";
  const isHistoryMode = mode ? mode === "history" : order?.statusOrder === "delivered";

  // If no route and not realtime coords, show helpful message instead of broken map
  const hasAnyValidCoords = isValidPoint(coords) || hasValidRoute || (restaurant && isValidLat(restaurant.lat) && isValidLng(restaurant.lng));
  if (!hasAnyValidCoords) {
    return (
      <div style={{ padding: 20 }}>
        <h3>⚠️ Không có dữ liệu vị trí để hiển thị bản đồ</h3>
        <p>Đơn hàng này chưa có tọa độ hợp lệ (restaurant/customer/route). Vui lòng kiểm tra dữ liệu trong backend.</p>
        <div style={{ marginTop: 12 }}>
          {onClose && <button onClick={onClose} style={{ padding: "8px 12px", background: "#ff6f2c", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>Đóng</button>}
        </div>
      </div>
    );
  }

  // compute center from route last point (prefer), else restaurant, else warehouse
  const centerSource = hasValidRoute ? routeHistory[routeHistory.length - 1] : (isValidPoint(coords) ? coords : (restaurant && isValidLat(restaurant.lat) && isValidLng(restaurant.lng) ? [restaurant.lng!, restaurant.lat!] : [warehouse.lng, warehouse.lat]));
  const center = { longitude: centerSource[0], latitude: centerSource[1], zoom: 12 };

  // ---------- Map UI ----------
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* PANEL */}
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
        <div>🚀 Còn lại: {(distanceDroneToRestaurant + distanceDroneToCustomer).toFixed(2)} km</div>
        <div style={{ marginTop: 8, fontSize: 12, fontWeight: 500 }}>
          Tổng dự kiến: {totalDistance.toFixed(2)} km
        </div>
        <div style={{ marginTop: 8, fontSize: 12, fontWeight: 500 }}>
          Mode: {isRealtimeMode ? "Realtime" : isHistoryMode ? "History" : "N/A"} • Route pts: {routeHistory.length}
        </div>
      </div>

      {/* CLOSE BUTTON */}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "transparent",
            color: "#111",
            border: "none",
            padding: "6px 10px",
            cursor: "pointer",
            zIndex: 11,
            fontWeight: 700,
          }}
        >
          Đóng
        </button>
      )}

      {/* MAP */}
      <Map
        mapLib={maplibregl}
        initialViewState={center}
        style={{ width: "100%", height: "100%" }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      >
        {/* Warehouse marker (informational) */}
        <Marker longitude={warehouse.lng} latitude={warehouse.lat} anchor="bottom">
          <MarkerLabel color="#0066ff" label="Warehouse" />
        </Marker>

        {/* Restaurant */}
        {restaurant && isValidLat(restaurant.lat) && isValidLng(restaurant.lng) && (
          <Marker longitude={restaurant.lng!} latitude={restaurant.lat!} anchor="bottom">
            <MarkerLabel color="#00c853" label="Restaurant" />
          </Marker>
        )}

        {/* Customer */}
        {customer && isValidLat(customer.lat) && isValidLng(customer.lng) && (
          <Marker longitude={customer.lng!} latitude={customer.lat!} anchor="bottom">
            <MarkerLabel color="#ff1744" label="Customer" />
          </Marker>
        )}

        {/* Route Line (render for both realtime & history if available) */}
        {routeHistory.length > 1 && (
          <Source
            id="route"
            type="geojson"
            data={{
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: routeHistory,
              },
            }}
          >
            <Layer id="route-line" type="line" paint={{ "line-color": "#ff6600", "line-width": 4 }} />
          </Source>
        )}

        {/* Drone realtime marker (only when realtime) */}
        {isRealtimeMode && isValidPoint(coords) && (
          <Marker longitude={coords![0]} latitude={coords![1]} anchor="bottom">
            <MarkerLabel color="orange" label="Drone" size={20} />
          </Marker>
        )}

        {/* Drone last marker for history view */}
        {!isRealtimeMode && routeHistory.length > 0 && (
          <Marker longitude={routeHistory[routeHistory.length - 1][0]} latitude={routeHistory[routeHistory.length - 1][1]} anchor="bottom">
            <MarkerLabel color="gray" label="Drone (Last)" size={18} />
          </Marker>
        )}
      </Map>
    </div>
  );
}

// MarkerLabel component (same visual as before)
type MarkerLabelProps = {
  label: string;
  color: string;
  size?: number;
};
function MarkerLabel({ color, label, size = 16 }: MarkerLabelProps) {
  return (
    <div style={{ textAlign: "center", pointerEvents: "none" }}>
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
          background: "rgba(255,255,255,0.9)",
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
