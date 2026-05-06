// FULL UPDATED ORDER MANAGEMENT CODE WILL BE HERE
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import DroneTestWeb from "../components/drone-test-web";

// Normalise the API base so we never end up with duplicated /api segments.
const RAW_API_URL = (import.meta.env.VITE_API_URL ?? "http://172.20.10.3:1337").trim();
const NORMALIZED_API_URL = RAW_API_URL.replace(/\/+$/, "");
const API_ROOT = NORMALIZED_API_URL.endsWith("/api") ? NORMALIZED_API_URL : `${NORMALIZED_API_URL}/api`;

type OrderManagementProps = {
  token?: string | null;
  user?: { id?: number | null } | null;
};

type OrderStatus = "pending" | "confirmed" | "ready" | "delivering" | "canceled" | "delivered";
const ORDER_STATUS_VALUES: OrderStatus[] = ["pending", "confirmed", "ready", "delivering", "canceled", "delivered"];

type PaymentStatus = "paid" | "unpaid" | "refunded";
const PAYMENT_STATUS_VALUES: PaymentStatus[] = ["paid", "unpaid", "refunded"];

type CustomerInfo = {
  id: number | null;
  name: string;
  email: string;
  phone: string;
};

type OrderItem = {
  id: number | null;
  dishId: number | null;
  dishName: string;
  quantity: number;
  price: number;
  subtotal: number;
};
export type LocationJSON = {
  lat: number;
  lng: number;
} | null;

export type Order = {
  id: number;
  code: string;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  note: string;
  phoneNumber: string;
  createdAt: string;
  updatedAt: string;
  restaurant: {
    id: number | null;
    name: string;
    location: LocationJSON;
  };
  customer: CustomerInfo;
  items: OrderItem[];
  customerLocation: LocationJSON;
  route: Array<{ lat: number, lng: number }> | null;
};

type ManagedRestaurant = {
  id: number;
  name: string;
};

const ORDER_STATUS_META: Record<OrderStatus, { label: string; badge: { background: string; color: string } }> = {
  pending: {
    label: "Chờ xác nhận",
    badge: { background: "#fef3c7", color: "#b45309" },
  },
  confirmed: {
    label: "Xác nhận",
    badge: { background: "#dcfce7", color: "#15803d" },
  },
  ready: {
    label: "Sẵn sàng",
    badge: { background: "#fff7ed", color: "#c2410c" },
  },
  delivering: {
    label: "Đang giao",
    badge: { background: "#e8f0ff", color: "#1e40af" },
  },
  canceled: {
    label: "Huỷ",
    badge: { background: "#fee2e2", color: "#b91c1c" },
  },
  delivered: {
    label: "Đã giao",
    badge: { background: "#e0f2fe", color: "#0369a1" },
  },
};

const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; badge: { background: string; color: string } }> = {
  unpaid: {
    label: "Chưa thanh toán",
    badge: { background: "#fef3c7", color: "#b45309" },
  },
  paid: {
    label: "Đã thanh toán",
    badge: { background: "#dcfce7", color: "#15803d" },
  },
  refunded: {
    label: "Đã hoàn tiền",
    badge: { background: "#ede9fe", color: "#6b21a8" },
  },
};

const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: ORDER_STATUS_META.pending.label },
  { value: "confirmed", label: ORDER_STATUS_META.confirmed.label },
  { value: "ready", label: ORDER_STATUS_META.ready.label },
  { value: "delivering", label: ORDER_STATUS_META.delivering.label },
  { value: "canceled", label: ORDER_STATUS_META.canceled.label },
  { value: "delivered", label: ORDER_STATUS_META.delivered.label },
];

const currencyFormatter = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });
const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const baseControlStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #ffcfa9",
  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
  outline: "none",
  fontFamily: "inherit",
  fontSize: 14,
  background: "white",
};

const selectControlStyle: CSSProperties = {
  ...baseControlStyle,
  appearance: "none",
  backgroundImage:
    "linear-gradient(45deg, transparent 50%, #ff6f2c 50%), linear-gradient(135deg, #ff6f2c 50%, transparent 50%)",
  backgroundPosition: "calc(100% - 20px) calc(1.1em), calc(100% - 15px) calc(1.1em)",
  backgroundSize: "5px 5px, 5px 5px",
  backgroundRepeat: "no-repeat",
};

const searchControlStyle: CSSProperties = {
  ...baseControlStyle,
  paddingLeft: 36,
  backgroundImage:
    "url('data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke-width=\'1.5\' stroke=\'%23ff6f2c\' %3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'M15.75 15.75L21 21M18 10.5a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z\'/%3E%3C/svg%3E')",
  backgroundSize: "18px",
  backgroundPosition: "12px center",
  backgroundRepeat: "no-repeat",
};

const normalizeOrderStatus = (value: unknown): OrderStatus => {
  if (typeof value === "string") {
    const normalized = value.toLowerCase() as OrderStatus;
    if (ORDER_STATUS_VALUES.includes(normalized)) {
      return normalized;
    }
  }
  return "pending";
};

const normalizePaymentStatus = (value: unknown): PaymentStatus => {
  if (typeof value === "string") {
    const normalized = value.toLowerCase() as PaymentStatus;
    if (PAYMENT_STATUS_VALUES.includes(normalized)) {
      return normalized;
    }
  }
  return "unpaid";
};

const ensureRelationEntry = (value: any) => {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    const first = value[0];
    return ensureRelationEntry(first);
  }

  if (value && typeof value === "object" && "data" in value) {
    return value.data;
  }

  return value;
};

const mapOrderItem = (raw: any): OrderItem | null => {
  if (!raw) {
    return null;
  }

  const attributesSource = raw?.attributes && typeof raw.attributes === "object" ? raw.attributes : raw;
  const attributes = (attributesSource ?? {}) as Record<string, unknown>;

  const idValue = raw?.id ?? attributes.id;
  const dishEntry = ensureRelationEntry((attributes as any)?.dish ?? (raw as any)?.dish);
  const dishAttributes = (dishEntry?.attributes ?? dishEntry ?? {}) as Record<string, unknown>;
  const dishIdValue = dishEntry?.id ?? dishAttributes.id;
  const dishNameCandidates = [dishAttributes?.name, (dishAttributes as any)?.title, (dishAttributes as any)?.label];
  const dishName = dishNameCandidates.find((candidate) => typeof candidate === "string" && candidate.trim() !== "");

  const quantityRaw = (attributes as any)?.quantity ?? 0;
  const quantityValue = Number(quantityRaw);
  const quantity = Number.isFinite(quantityValue) ? quantityValue : 0;

  const priceRaw = (attributes as any)?.price ?? 0;
  const priceValue = Number(priceRaw);
  const price = Number.isFinite(priceValue) ? priceValue : 0;

  return {
    id: Number.isFinite(Number(idValue)) ? Number(idValue) : null,
    dishId: Number.isFinite(Number(dishIdValue)) ? Number(dishIdValue) : null,
    dishName: dishName ? String(dishName) : "Món ăn",
    quantity,
    price,
    subtotal: price * quantity,
  };
};

const parseLocation = (value: any): { lat: number; lng: number } | null => {
  if (
    value &&
    typeof value === "object" &&
    typeof value.lat === "number" &&
    typeof value.lng === "number"
  ) {
    return { lat: value.lat, lng: value.lng };
  }
  return null;
};

const mapOrder = (raw: any): Order => {
  const attributesSource = raw?.attributes && typeof raw.attributes === "object" ? raw.attributes : raw;
  const attributes = (attributesSource ?? {}) as Record<string, unknown>;

  const idValue = raw?.id ?? attributes.id;
  const id = Number.isFinite(Number(idValue)) ? Number(idValue) : 0;

  const code = typeof attributes?.orderID === "string" && attributes.orderID ? attributes.orderID : `ORD-${id}`;

  const totalRaw = attributes?.totalPrice ?? 0;
  const totalValue = Number(totalRaw);
  const total = Number.isFinite(totalValue) ? totalValue : 0;

  const status = normalizeOrderStatus(attributes?.statusOrder);
  const paymentStatus = normalizePaymentStatus(attributes?.paymentStatus);

  const note = typeof attributes?.note === "string" ? attributes.note : "";
  const phoneNumber = typeof attributes?.phoneNumber === "string" ? attributes.phoneNumber : "";
  const createdAt = typeof attributes?.createdAt === "string" ? attributes.createdAt : "";
  const updatedAt = typeof attributes?.updatedAt === "string" ? attributes.updatedAt : createdAt;


  const restaurantEntry = ensureRelationEntry(attributes?.restaurant);
  const restaurantAttributes = (restaurantEntry?.attributes ?? restaurantEntry ?? {}) as Record<string, unknown>;
  const restaurantIdValue = restaurantEntry?.id ?? restaurantAttributes.id;
  const restaurantName = typeof restaurantAttributes?.name === "string" ? restaurantAttributes.name : "Nhà hàng";
  const restaurantLocation = parseLocation(restaurantAttributes?.location);
  const customerLocation = parseLocation(attributes?.customerLocation);
  const userEntry = ensureRelationEntry(attributes?.users_permissions_user);
  const userAttributes = (userEntry?.attributes ?? userEntry ?? {}) as Record<string, unknown>;
  const userIdValue = userEntry?.id ?? userAttributes.id;
  const customerName = typeof userAttributes?.fullName === "string" && userAttributes.fullName
    ? userAttributes.fullName
    : typeof userAttributes?.name === "string" && userAttributes.name
      ? userAttributes.name
      : typeof userAttributes?.email === "string" ? userAttributes.email : "Khách hàng";
  const customerEmail = typeof userAttributes?.email === "string" ? userAttributes.email : "";
  const customerPhone = typeof userAttributes?.phone === "string" && userAttributes.phone
    ? userAttributes.phone
    : phoneNumber;
  const route = attributes?.route;
  const itemsContainer = attributes?.order_items ?? (raw as any)?.order_items ?? [];
  let itemEntries: any[] = [];
  if (Array.isArray(itemsContainer?.data)) {
    itemEntries = itemsContainer.data;
  } else if (Array.isArray(itemsContainer)) {
    itemEntries = itemsContainer;
  } else if (itemsContainer?.data) {
    itemEntries = [itemsContainer.data];
  } else if (itemsContainer) {
    itemEntries = [itemsContainer];
  }

  const items = itemEntries
    .map(mapOrderItem)
    .filter((item): item is OrderItem => Boolean(item));

  return {
    id,
    code: String(code),
    total,
    status,
    paymentStatus,
    note,
    phoneNumber: customerPhone ? String(customerPhone) : phoneNumber,
    createdAt,
    updatedAt,
    restaurant: {
      id: Number.isFinite(Number(restaurantIdValue)) ? Number(restaurantIdValue) : null,
      name: restaurantName,
      location: restaurantLocation,
    },
    customer: {
      id: Number.isFinite(Number(userIdValue)) ? Number(userIdValue) : null,
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
    },
    items,
    customerLocation,
    route: Array.isArray(route) ? route.map(parseLocation).filter((loc): loc is { lat: number; lng: number } => loc !== null) : null,
  };
};

const extractManagerId = (rawUser: unknown): number | string | null => {
  if (!rawUser || typeof rawUser !== "object") {
    return null;
  }

  const candidateIds = [
    (rawUser as any)?.id,
    (rawUser as any)?.user?.id,
    (rawUser as any)?.data?.id,
    (rawUser as any)?.user?.data?.id,
  ];

  for (const candidate of candidateIds) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }

    if (typeof candidate === "string" && candidate.trim() !== "") {
      const numeric = Number(candidate);
      return Number.isFinite(numeric) ? numeric : candidate.trim();
    }
  }

  return null;
};

export default function OrderManagement({ token: tokenProp, user: userProp }: OrderManagementProps) {
  const resolvedToken = useMemo(() => {
    if (typeof tokenProp === "string") {
      return tokenProp;
    }
    return localStorage.getItem("restaurant_admin_token");
  }, [tokenProp]);

  const resolvedUser = useMemo(() => {
    if (userProp) {
      return userProp;
    }

    const storedUser = localStorage.getItem("restaurant_admin_user");
    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser);
    } catch (error) {
      console.warn("Không thể parse user từ localStorage", error);
      return null;
    }
  }, [userProp]);

  
  const managerId = useMemo(() => extractManagerId(resolvedUser), [resolvedUser]);

  const [managedRestaurants, setManagedRestaurants] = useState<ManagedRestaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("paid");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [statusDraft, setStatusDraft] = useState<OrderStatus | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<PaymentStatus | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [showDroneTracking, setShowDroneTracking] = useState(false);
  // Realtime (polling)
  const POLLING_DEFAULT_MS = 5000;
  const pollingRef = useRef<number | null>(null);

  const feedbackTimeoutRef = useRef<number | null>(null);

  const handleAuthError = useCallback((message: string) => {
    setApiError(message);
    localStorage.removeItem("restaurant_admin_token");
    localStorage.removeItem("restaurant_admin_user");
    setManagedRestaurants([]);
    setSelectedRestaurantId(null);
    setOrders([]);
    setSelectedOrderId(null);
    setShowDroneTracking(false);
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = null;
      }
    };
  }, []);

  const showFeedback = useCallback((message: string) => {
    setFeedback(message);
    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFeedback(null);
      feedbackTimeoutRef.current = null;
    }, 3000);
  }, []);

  const fetchManagedRestaurants = useCallback(async () => {
    if (!resolvedToken || !managerId) {
      setApiError("Không tìm thấy thông tin đăng nhập quản lý.");
      return;
    }

    const buildRestaurantUrl = (withManagerFilter: boolean) => {
      const url = new URL(`${API_ROOT}/restaurants`);
      url.searchParams.append("fields[0]", "name");
      url.searchParams.append("fields[1]", "id");
      if (withManagerFilter) {
        url.searchParams.append("filters[manager][id][$eq]", String(managerId));
      }
      return url;
    };

    const requestList = async (withManagerFilter: boolean) => {
      const response = await fetch(buildRestaurantUrl(withManagerFilter).toString(), {
        headers: { Authorization: `Bearer ${resolvedToken}` },
      });

      const data = await response
        .json()
        .catch(() => ({}));

      if (response.status === 401) {
        handleAuthError("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
        return null;
      }

      if (response.status === 403) {
        const message = data?.error?.message ?? "Tài khoản không có quyền truy cập nhà hàng này.";
        setApiError(message);
        setManagedRestaurants([]);
        setSelectedRestaurantId(null);
        setOrders([]);
        setSelectedOrderId(null);
        return null;
      }

      if (!response.ok) {
        throw new Error(data?.error?.message ?? "Không thể lấy thông tin nhà hàng.");
      }

      return Array.isArray(data?.data) ? data.data : [];
    };

    try {
      setApiError(null);

      let rawList = await requestList(true);
      if (rawList === null) {
        return;
      }

      if (rawList.length === 0) {
        rawList = await requestList(false);
        if (rawList === null) {
          return;
        }
      }

      if (rawList.length === 0) {
        setManagedRestaurants([]);
        setSelectedRestaurantId(null);
        setOrders([]);
        setSelectedOrderId(null);
        setApiError("Tài khoản này chưa được gán vào nhà hàng nào.");
        return;
      }

      const mapped: ManagedRestaurant[] = rawList
        .map((entry: any): ManagedRestaurant | null => {
          const rawId = entry?.id ?? entry?.attributes?.id ?? null;
          const resolvedId = Number(rawId);
          if (!Number.isFinite(resolvedId)) {
            return null;
          }

          const attributes = (entry?.attributes ?? entry ?? {}) as Record<string, unknown>;
          const nameCandidates = [attributes?.name, (attributes as any)?.title, entry?.name];
          const name = nameCandidates.find(
            (candidate) => typeof candidate === "string" && candidate.trim() !== ""
          );

          return {
            id: resolvedId,
            name: name ? String(name) : `Nhà hàng #${resolvedId}`,
          };
        })
        .filter((value: ManagedRestaurant | null): value is ManagedRestaurant => Boolean(value));

      if (mapped.length === 0) {
        setManagedRestaurants([]);
        setSelectedRestaurantId(null);
        setOrders([]);
        setSelectedOrderId(null);
        setApiError("Không xác định được nhà hàng quản lý.");
        return;
      }

      setManagedRestaurants(mapped);
      setSelectedRestaurantId((current) => {
        if (typeof current === "number" && mapped.some((restaurant) => restaurant.id === current)) {
          return current;
        }

        return mapped[0].id;
      });
    } catch (error: any) {
      setApiError(error?.message ?? "Có lỗi xảy ra khi tải thông tin nhà hàng.");
    }
  }, [handleAuthError, managerId, resolvedToken]);

  const fetchOrders = useCallback(
    async (targetRestaurantId: number | null, options?: { silent?: boolean }) => {
      if (!resolvedToken) {
        return;
      }

      const silent = options?.silent ?? false;

      try {
        if (!silent) {
          setListLoading(true);
        }
        setApiError(null);

        const url = new URL(`${API_ROOT}/orders/manager`);
        if (typeof targetRestaurantId === "number" && Number.isFinite(targetRestaurantId)) {
          // server expects a `restaurantId` query param for the manager endpoint
          url.searchParams.append("restaurantId", String(targetRestaurantId));
          // keep the filters param as well for compatibility with other endpoints
          url.searchParams.append("filters[restaurant][id][$eq]", String(targetRestaurantId));
        }
        url.searchParams.append("sort[0]", "createdAt:desc");
        url.searchParams.append("pagination[pageSize]", "50");
        // Ensure related entries (order items, dish relation, user, restaurant, etc.) are populated
        // so the client can read `attributes.order_items.data` and nested `dish` info.
        url.searchParams.append("populate", "*");

        console.log('🔍 Fetching orders from:', url.toString());

        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${resolvedToken}` },
        });

        const data = await response
          .json()
          .catch(() => ({}));

        console.log(' Response status:', response.status);
        console.log(' Response data:', data);

        if (response.status === 401) {
          handleAuthError("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
          return;
        }

        if (response.status === 403) {
          const message = data?.error?.message ?? "Bạn không có quyền xem đơn hàng của nhà hàng này.";
          setApiError(message);
          setOrders([]);
          setSelectedOrderId(null);
          return;
        }

        if (!response.ok) {
          throw new Error(data?.error?.message ?? "Không thể tải danh sách đơn hàng.");
        }

        const parsed: Order[] = Array.isArray(data?.data)
          ? data.data.map((entry: any) => mapOrder(entry))
          : [];
        setOrders(parsed);
        setSelectedOrderId((current) => {
          if (parsed.length === 0) {
            return null;
          }

          if (current && parsed.some((order) => order.id === current)) {
            return current;
          }

          return parsed[0].id;
        });
      } catch (error: any) {
        setApiError(error?.message ?? "Có lỗi khi tải danh sách đơn hàng.");
      } finally {
        if (!silent) {
          setListLoading(false);
        }
      }
    },
    [resolvedToken]
  );

  useEffect(() => {
    fetchManagedRestaurants();
  }, [fetchManagedRestaurants]);

  // Polling: refresh orders at an interval while the page is visible
  useEffect(() => {
    if (typeof selectedRestaurantId !== "number" || !Number.isFinite(selectedRestaurantId)) return;

    // polling mounted flag not required

    const tick = async () => {
      try {
        await fetchOrders(selectedRestaurantId, { silent: true });
      } catch (e) {
        // errors are handled inside fetchOrders
      }
    };

    // initial immediate fetch
    tick();

    const onVisibility = () => {
      if (!document.hidden) {
        tick();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);

    pollingRef.current = window.setInterval(() => {
      if (!document.hidden) {
        tick();
      }
    }, POLLING_DEFAULT_MS) as unknown as number;

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current as unknown as number);
        pollingRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, [selectedRestaurantId, fetchOrders]);

  useEffect(() => {
    if (typeof selectedRestaurantId !== "number" || !Number.isFinite(selectedRestaurantId)) {
      return;
    }

    fetchOrders(selectedRestaurantId);
  }, [selectedRestaurantId, fetchOrders]);

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) {
      return null;
    }
    return orders.find((order) => order.id === selectedOrderId) ?? null;
  }, [orders, selectedOrderId]);

  useEffect(() => {
    if (!selectedOrder) {
      setStatusDraft(null);
      setPaymentDraft(null);
      return;
    }
    console.log('Selected order changed:', selectedOrder);
    setStatusDraft(selectedOrder.status);
    setPaymentDraft(selectedOrder.paymentStatus);
  }, [selectedOrder]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      if (
        typeof selectedRestaurantId === "number" &&
        Number.isFinite(selectedRestaurantId) &&
        order.restaurant.id !== selectedRestaurantId
      ) {
        return false;
      }

      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }

      if (paymentFilter !== "all" && order.paymentStatus !== paymentFilter) {
        return false;
      }

      if (normalizedSearch) {
        const haystack = [
          order.code,
          order.customer.name,
          order.customer.email,
          order.customer.phone,
          order.phoneNumber,
          order.note,
          ...order.items.map((item) => item.dishName),
        ]
          .filter(Boolean)
          .map((value) => value.toString().toLowerCase());

        const matched = haystack.some((value) => value.includes(normalizedSearch));
        if (!matched) {
          return false;
        }
      }

      return true;
    });
  }, [orders, statusFilter, paymentFilter, searchTerm, selectedRestaurantId]);

  const selectedRestaurantLabel = useMemo(() => {
    if (managedRestaurants.length === 0) {
      return null;
    }

    if (typeof selectedRestaurantId === "number") {
      const matched = managedRestaurants.find((restaurant) => restaurant.id === selectedRestaurantId);
      if (matched) {
        return `Đang quản lý đơn của ${matched.name}.`;
      }

      return "Đang quản lý đơn của nhà hàng đã chọn.";
    }

    return null;
  }, [managedRestaurants, selectedRestaurantId]);

  const handleUpdateOrderStatus = useCallback(async () => {
    if (!resolvedToken) {
      setApiError("Thiếu token xác thực.");
      return;
    }

    if (!selectedOrder) return;

    const updates: Record<string, unknown> = {};

    if (statusDraft && statusDraft !== selectedOrder.status)
      updates.statusOrder = statusDraft;

    if (paymentDraft && paymentDraft !== selectedOrder.paymentStatus)
      updates.paymentStatus = paymentDraft;

    if (Object.keys(updates).length === 0) {
      showFeedback("Không có thay đổi để lưu.");
      return;
    }

    if ((updates as any).statusOrder === "delivered") {
      showFeedback("Trạng thái 'Đã giao' chỉ do khách hàng xác nhận.");
      return;
    }

    try {
      setUpdatingOrderId(selectedOrder.id);
      setApiError(null);

      // 🚀 FIX ENDPOINT HERE
      const response = await fetch(`${API_ROOT}/orders/manager/${selectedOrder.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resolvedToken}`,
        },
        body: JSON.stringify({ data: updates }),
      });

      if (response.status === 401) {
        handleAuthError("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
        return;
      }

      const result = await response.json();
      console.log(' Update order response:', result);
      if (!response.ok) {
        throw new Error(result?.error?.message ?? "Không thể cập nhật đơn hàng.");
      }

      // 🟩 FIX parse đúng data
      const updatedOrder = mapOrder(result.data);

      // 🟩 Update danh sách để UI thấy ngay
      setOrders((prev) =>
        prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
      );

      setSelectedOrderId(updatedOrder.id);

      showFeedback("Đã cập nhật đơn hàng.");

      // 🟩 REFRESH lại danh sách (silent)
      const rid = updatedOrder?.restaurant?.id ?? selectedRestaurantId;
      if (rid) fetchOrders(rid, { silent: true });

      // ===== NEW: trigger drone API when status changed to delivering ======
      // Some backends name this endpoint differently; try common variants.
      if ((updates as any).statusOrder === "delivering") {
        const tryTrigger = async () => {
          const variants = [
            `${API_ROOT}/orders/trigger-drone/${updatedOrder.id}`,
          ];

          for (const url of variants) {
            try {
              console.log("Attempting trigger drone via", url);
              const res = await fetch(url, {
                method: "POST",
                headers: { Authorization: `Bearer ${resolvedToken}` },
              });
              if (res.ok) {
                console.log("trigger drone OK", url);
                return true;
              }
              console.warn("trigger drone failed", url, res.status);
            } catch (e) {
              console.warn("trigger drone error", url, e);
            }
          }

          return false;
        };

        try {
          const ok = await tryTrigger();
          if (ok) {
            showFeedback("Đã khởi động drone (backend). Đang chuyển sang trạng thái giao.");
            // refresh to pick up route & any drone metadata
            if (rid) await fetchOrders(rid, { silent: true });
          } else {
            showFeedback("Không thể khởi động drone — backend có thể không hỗ trợ endpoint này.");
            console.warn("Trigger drone attempts all failed");
          }
        } catch (e) {
          console.warn("trigger drone unexpected error", e);
        }
      }

    } catch (err: any) {
      setApiError(err.message ?? "Có lỗi khi cập nhật đơn hàng.");
    } finally {
      setUpdatingOrderId(null);
    }
  }, [paymentDraft, resolvedToken, selectedOrder, showFeedback, statusDraft, handleAuthError, fetchOrders, selectedRestaurantId]);

  const handleRefresh = useCallback(() => {
    if (typeof selectedRestaurantId !== "number" || !Number.isFinite(selectedRestaurantId)) {
      return;
    }
    fetchOrders(selectedRestaurantId);
  }, [fetchOrders, selectedRestaurantId]);

  const totalOrders = orders.filter((order) => order.paymentStatus === "paid").length;
  const pendingOrders = orders.filter((order) => order.status === "pending" && order.paymentStatus === "paid").length;
  const confirmedOrders = orders.filter((order) => order.status === "confirmed" && order.paymentStatus === "paid").length;
  const readyOrders = orders.filter((order) => order.status === "ready" && order.paymentStatus === "paid").length;
  const deliveringOrders = orders.filter((order) => order.status === "delivering" && order.paymentStatus === "paid").length;
  const deliveredOrders = orders.filter((order) => order.status === "delivered").length;

  const tokenMissing = !resolvedToken || !managerId;

  if (tokenMissing) {
    return <p> Vui lòng đăng nhập để quản lý đơn hàng.</p>;
  }

  return (
    <div style={{ width: '100%', maxWidth: 1200, margin: '0 auto' }}>
      <div
        style={{
          background: "linear-gradient(135deg, #ff6f2c 0%, #e25a00 100%)",
          borderRadius: 20,
          padding: "24px 28px",
          marginBottom: 24,
          boxShadow: "0 8px 24px rgba(255,111,44,0.25)",
        }}
      >
        <h2
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: "white",
            marginBottom: 8,
          }}
        >
          Quản lý đơn hàng
        </h2>
        <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 15 }}>
          Theo dõi trạng thái đơn, xem chi tiết món trong từng đơn hàng.
        </p>
      </div>

      {apiError && <p style={{ color: "#dc2626", marginBottom: 12 }}>{apiError}</p>}
      {feedback && <p style={{ color: "#16a34a", marginBottom: 12 }}>{feedback}</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <SummaryCard label="Tổng đơn" value={totalOrders} accent="#ff6f2c" />
        <SummaryCard label="Chờ xác nhận" value={pendingOrders} accent="#f59e0b" />
        <SummaryCard label="Xác nhận" value={confirmedOrders} accent="#10b981" />
        <SummaryCard label="Sẵn sàng" value={readyOrders} accent="#f97316" />
        <SummaryCard label="Đang giao" value={deliveringOrders} accent="#3b82f6" />
        <SummaryCard label="Đã giao" value={deliveredOrders} accent="#0ea5e9" />
      </div>

      {selectedRestaurantLabel && (
        <p style={{ color: "#6b7280", marginBottom: 16 }}>{selectedRestaurantLabel}</p>
      )}

      <div
        style={{
          background: "white",
          border: "1px solid #ffe8d6",
          borderRadius: 20,
          padding: "24px 28px",
          boxShadow: "0 4px 20px rgba(255,111,44,0.08)",
          marginBottom: 24,
        }}
      >
        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#e25a00",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          Bộ lọc đơn hàng
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <ControlField label="Trạng thái đơn">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={selectControlStyle}
            >
              <option value="all">Tất cả</option>
              {ORDER_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </ControlField>

          <ControlField label="Tìm kiếm">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Mã đơn, số điện thoại,..."
              style={searchControlStyle}
            />
          </ControlField>

        </div>
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setStatusFilter("all");
              setPaymentFilter("paid");
              setSearchTerm("");
            }}
            style={{
              background: "white",
              color: "#e25a00",
              borderRadius: 12,
              border: "2px solid #ffe8d6",
              padding: "10px 24px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            🗑️ Bỏ lọc
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={listLoading}
            style={{
              background: "linear-gradient(135deg, #ff6f2c 0%, #e25a00 100%)",
              color: "white",
              border: "none",
              borderRadius: 12,
              padding: "10px 24px",
              fontWeight: 600,
              cursor: listLoading ? "not-allowed" : "pointer",
              opacity: listLoading ? 0.7 : 1,
              boxShadow: "0 4px 12px rgba(255,111,44,0.3)",
              fontSize: 14,
              display:
                typeof selectedRestaurantId === "number" && Number.isFinite(selectedRestaurantId)
                  ? undefined
                  : "none",
            }}
          >
            {listLoading ? "⏳ Đang tải..." : "🔄 Làm mới"}
          </button>
        </div>

        {listLoading ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: "#6b7280",
            }}
          >
            <p>Đang tải danh sách đơn hàng...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              background: "#fff5eb",
              borderRadius: 16,
            }}
          >
            <p style={{ color: "#6b7280", fontSize: 16 }}>
              Chưa có đơn hàng nào phù hợp với bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <div
            style={{
              overflowX: "auto",
              borderRadius: 16,
              border: "1px solid #ffe8d6",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    textAlign: "left",
                    background: "linear-gradient(135deg, #fff5eb 0%, #ffe8d6 100%)",
                  }}
                >
                  <th style={{ padding: "10px 12px", fontWeight: 600, color: "#e25a00", justifyContent: "center" }}>Mã đơn</th>
                  <th style={{ padding: "10px 12px", fontWeight: 600, color: "#e25a00", justifyContent: "center" }}>Khách hàng</th>
                  <th style={{ padding: "10px 12px", fontWeight: 600, color: "#e25a00", justifyContent: "center" }}>Liên hệ</th>
                  <th style={{ padding: "10px 12px", fontWeight: 600, color: "#e25a00", justifyContent: "center" }}>Tổng tiền</th>
                  <th style={{ padding: "10px 12px", fontWeight: 600, color: "#e25a00", justifyContent: "center" }}>Trạng thái</th>
                  <th style={{ padding: "10px 12px", fontWeight: 600, color: "#e25a00", justifyContent: "center" }}>Thanh Toán</th>
                  <th style={{ padding: "10px 12px", fontWeight: 600, color: "#e25a00", justifyContent: "center" }}>Tạo lúc</th>
                  <th style={{ padding: "10px 12px", fontWeight: 600, color: "#e25a00", justifyContent: "center" }}>Xem</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const isSelected = selectedOrderId === order.id;
                  return (
                    <tr
                      key={order.id}
                      style={{
                        background: isSelected ? "#fff5eb" : "transparent",
                        borderTop: "1px solid #ffe2c7",
                      }}
                    >
                      <td style={{ padding: "12px", verticalAlign: "top", fontWeight: 600 }}>{order.code}</td>
                      <td style={{ padding: "12px", verticalAlign: "top" }}>
                        <div style={{ fontWeight: 600 }}>{order.customer.name}</div>
                        {order.customer.email && (
                          <div style={{ color: "#6b7280", fontSize: 13 }}>{order.customer.email}</div>
                        )}
                      </td>
                      <td style={{ padding: "12px", verticalAlign: "top", color: "#6b7280" }}>
                        {order.customer.phone || order.phoneNumber || "—"}
                      </td>
                      <td style={{ padding: "12px", verticalAlign: "top", color: "#ff6f2c", fontWeight: 600 }}>
                        {currencyFormatter.format(order.total)}
                      </td>
                      <td style={{ padding: "12px", verticalAlign: "top" }}>
                        <StatusBadge
                          label={ORDER_STATUS_META[order.status].label}
                          colors={ORDER_STATUS_META[order.status].badge}
                        />
                      </td>
                      <td style={{ padding: "12px", verticalAlign: "top" }}>
                        <StatusBadge
                          label={PAYMENT_STATUS_META[order.paymentStatus].label}
                          colors={PAYMENT_STATUS_META[order.paymentStatus].badge}
                        />
                      </td>
                      <td style={{ padding: "12px", verticalAlign: "top", color: "#6b7280", fontSize: 13 }}>
                        {order.createdAt ? dateTimeFormatter.format(new Date(order.createdAt)) : "—"}
                      </td>
                      <td style={{ padding: "12px", verticalAlign: "top" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(order.id)}
                          style={{
                            background: isSelected
                              ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                              : "white",
                            color: isSelected ? "white" : "#10b981",
                            border: isSelected ? "none" : "2px solid #10b981",
                            borderRadius: 10,
                            padding: "8px 16px",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontSize: 13,
                            transition: "all 0.2s",
                            boxShadow: isSelected
                              ? "0 4px 12px rgba(16,185,129,0.3)"
                              : "none",
                          }}
                        >
                          {isSelected ? "Đang xem" : "Chi tiết"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div
        style={{
          background: "white",
          border: "1px solid #ffcfa9",
          borderRadius: 16,
          padding: 20,
          boxShadow: "0 8px 24px rgba(255,138,31,0.06)",
        }}
      >
        {!selectedOrder ? (
          <p style={{ color: "#6b7280" }}>Chọn một đơn hàng trong danh sách để xem chi tiết.</p>
        ) : (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 18,
              }}
            >
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "#e25a00", margin: 0 }}>
                Đơn {selectedOrder.code}
              </h3>
              <StatusBadge
                label={ORDER_STATUS_META[selectedOrder.status].label}
                colors={ORDER_STATUS_META[selectedOrder.status].badge}
              />
              <StatusBadge
                label={PAYMENT_STATUS_META[selectedOrder.paymentStatus].label}
                colors={PAYMENT_STATUS_META[selectedOrder.paymentStatus].badge}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <DetailInfo label="Khách hàng" value={selectedOrder.customer.name} />
              <DetailInfo label="Email" value={selectedOrder.customer.email || "—"} />
              <DetailInfo label="Số điện thoại" value={selectedOrder.customer.phone || selectedOrder.phoneNumber || "—"} />
              <DetailInfo label="Tổng tiền" value={currencyFormatter.format(selectedOrder.total)} />
              <DetailInfo
                label="Tạo lúc"
                value={selectedOrder.createdAt ? dateTimeFormatter.format(new Date(selectedOrder.createdAt)) : "—"}
              />
              <DetailInfo
                label="Cập nhật"
                value={selectedOrder.updatedAt ? dateTimeFormatter.format(new Date(selectedOrder.updatedAt)) : "—"}
              />
            </div>

            {selectedOrder.note && (
              <div
                style={{
                  background: "#fff5eb",
                  border: "1px solid #ffe2c7",
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 20,
                  color: "#b45309",
                }}
              >
                <strong>Ghi chú:</strong> {selectedOrder.note}
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: "#e25a00" }}>Danh sách món</h4>
              {selectedOrder.items.length === 0 ? (
                <p style={{ color: "#6b7280" }}>Đơn hàng chưa có món ăn.</p>
              ) : (
                <div style={{ borderRadius: 12, border: "1px solid #ffe2c7", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ background: "#fff0e2" }}>
                      <tr>
                        <th style={{ padding: "10px 12px", textAlign: "left", color: "#e25a00", fontWeight: 600 }}>Món</th>
                        <th style={{ padding: "10px 12px", textAlign: "right", color: "#e25a00", fontWeight: 600 }}>Số lượng</th>
                        <th style={{ padding: "10px 12px", textAlign: "right", color: "#e25a00", fontWeight: 600 }}>Đơn giá</th>
                        <th style={{ padding: "10px 12px", textAlign: "right", color: "#e25a00", fontWeight: 600 }}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item) => (
                        <tr key={`${item.dishId ?? "dish"}-${item.id ?? item.dishName}`} style={{ borderTop: "1px solid #ffe2c7" }}>
                          <td style={{ padding: "12px" }}>{item.dishName}</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{item.quantity}</td>
                          <td style={{ padding: "12px", textAlign: "right", fontSize: 13, color: "#6b7280" }}>
                            {currencyFormatter.format(item.price)}
                          </td>
                          <td style={{ padding: "12px", textAlign: "right", color: "#ff6f2c", fontWeight: 600 }}>
                            {currencyFormatter.format(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <ControlField label="Trạng thái đơn">
                <select
                  value={statusDraft ?? selectedOrder.status}
                  onChange={(event) => setStatusDraft(event.target.value as OrderStatus)}
                  style={selectControlStyle}
                >
                  {ORDER_STATUS_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      disabled={option.value === "delivered"}
                    >
                      {option.label}{option.value === "delivered" ? " (khách xác nhận)" : ""}
                    </option>
                  ))}
                </select>
              </ControlField>
            </div>

            <button
              type="button"
              onClick={handleUpdateOrderStatus}
              disabled={updatingOrderId === selectedOrder.id}
              style={{
                background: "#ff6f2c",
                color: "white",
                borderRadius: 9999,
                border: "none",
                padding: "10px 24px",
                fontWeight: 600,
                cursor: updatingOrderId === selectedOrder.id ? "not-allowed" : "pointer",
                opacity: updatingOrderId === selectedOrder.id ? 0.7 : 1,
              }}
            >
              {updatingOrderId === selectedOrder.id ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
            <button
              type="button"
              onClick={() => setShowDroneTracking(true)}
              style={{
                background: "#3b82f6",
                color: "white",
                borderRadius: 9999,
                border: "none",
                padding: "10px 24px",
                fontWeight: 600,
                cursor: "pointer",
                marginLeft: 12,
                marginTop: 16,
              }}
            >
              🛰️ Drone Tracking
            </button>
          </div>
        )}
        
        {/* Drone Modal */}
        {showDroneTracking && selectedOrder && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0,0,0,0.45)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(2px)",
            }}
          >
            <div
              style={{
                width: "90%",
                height: "85%",
                background: "#fff",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                position: "relative",
              }}
            >
              

              {/* If locations are missing or invalid, show a clear message instead of rendering a broken map */}
              {(!selectedOrder.restaurant.location || !selectedOrder.customerLocation) ? (
                <div style={{ padding: 24 }}>
                  <h3 style={{ marginTop: 0 }}>⚠️ Không thể theo dõi Drone</h3>
                  <p>Đơn hàng này chưa có đầy đủ tọa độ của nhà hàng hoặc vị trí khách. Vui lòng kiểm tra thông tin vị trí trong Strapi.</p>
                  <div style={{ marginTop: 16 }}>
                    <button onClick={() => setShowDroneTracking(false)} style={{ background: '#ff6f2c', padding: '10px 16px', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Đóng</button>
                  </div>
                </div>
              ) : (
                <DroneTestWeb
                  orderId={String(selectedOrder.id)}
                  order={{
                    statusOrder: selectedOrder.status,
                    restaurant: {
                      location: {
                        lat: selectedOrder.restaurant.location?.lat ?? 0,
                        lng: selectedOrder.restaurant.location?.lng ?? 0,
                      }
                    },
                    customerLocation: {
                      lat: selectedOrder.customerLocation?.lat ?? 0,
                      lng: selectedOrder.customerLocation?.lng ?? 0,
                    },
                    route: selectedOrder.route?.map(p => [p.lat, p.lng]) ?? [],
                  }}
                  onClose={() => setShowDroneTracking(false)}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #ffe2c7",
        borderRadius: 16,
        padding: 18,
        boxShadow: "0 8px 18px rgba(255,138,31,0.08)",
      }}
    >
      <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: accent }}>{value}</div>
    </div>
  );
}

function StatusBadge({
  label,
  colors,
}: {
  label: string;
  colors: { background: string; color: string };
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 600,
        background: colors.background,
        color: colors.color,
        textTransform: "uppercase",
        letterSpacing: 0.4,
      }}
    >
      {label}
    </span>
  );
}

function DetailInfo({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "#fff5eb",
        border: "1px solid #ffe2c7",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div style={{ fontSize: 12, color: "#b45309", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontWeight: 600, color: "#374151", marginTop: 4 }}>{value}</div>
    </div>
  );
}

function ControlField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>{label}</span>
      {children}
    </label>
  );
}
