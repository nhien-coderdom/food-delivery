import { useCallback, useEffect, useMemo, useState } from "react";

const RAW_API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:1337").trim();
const NORMALIZED_API_URL = RAW_API_URL.replace(/\/+$/, "");
const API_ROOT = NORMALIZED_API_URL.endsWith("/api") ? NORMALIZED_API_URL : `${NORMALIZED_API_URL}/api`;

type RevenueProps = {
  token?: string | null;
  user?: { id?: number | null } | null;
};

type OrderStatus = "pending" | "confirmed" | "canceled" | "delivered";
type PaymentStatus = "paid" | "unpaid" | "refunded";

type RevenueOrder = {
  id: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  restaurant: { id: number | null; name: string };
};

type ManagedRestaurant = {
  id: number;
  name: string;
};

const ORDER_STATUS_VALUES: OrderStatus[] = ["pending", "confirmed", "canceled", "delivered"];
const PAYMENT_STATUS_VALUES: PaymentStatus[] = ["paid", "unpaid", "refunded"];

const currencyFormatter = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });
const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

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
    return ensureRelationEntry(value[0]);
  }

  if (value && typeof value === "object" && "data" in value) {
    return value.data;
  }

  return value;
};

const mapOrder = (raw: any): RevenueOrder => {
  const attributes = (raw?.attributes && typeof raw.attributes === "object") ? raw.attributes : raw;
  const idValue = raw?.id ?? attributes?.id;
  const totalValue = Number(attributes?.total ?? attributes?.totalPrice ?? 0);

  const restaurantEntry = ensureRelationEntry(attributes?.restaurant ?? (raw as any)?.restaurant);
  const restaurantAttributes = (restaurantEntry?.attributes ?? restaurantEntry ?? {}) as Record<string, unknown>;
  const restaurantIdValue = restaurantEntry?.id ?? restaurantAttributes?.id;
  const restaurantNameCandidates = [restaurantAttributes?.name, (restaurantAttributes as any)?.title];
  const restaurantName = restaurantNameCandidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim() !== ""
  );

  return {
    id: Number.isFinite(Number(idValue)) ? Number(idValue) : 0,
    total: Number.isFinite(totalValue) ? totalValue : 0,
    status: normalizeOrderStatus(attributes?.statusOrder ?? attributes?.status),
    paymentStatus: normalizePaymentStatus(attributes?.paymentStatus ?? attributes?.payment),
    createdAt: typeof attributes?.createdAt === "string" ? attributes.createdAt : "",
    restaurant: {
      id: Number.isFinite(Number(restaurantIdValue)) ? Number(restaurantIdValue) : null,
      name: restaurantName ? String(restaurantName) : "Nhà hàng",
    },
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

type DailyRevenuePoint = {
  date: string;
  label: string;
  revenue: number;
  orders: number;
};

export default function Revenue({ token: tokenProp, user: userProp }: RevenueProps) {
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
  const [orders, setOrders] = useState<RevenueOrder[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const tokenMissing = !resolvedToken || !managerId;

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
        url.searchParams.append("filters[managers][id][$eq]", String(managerId));
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
        setApiError("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
        localStorage.removeItem("restaurant_admin_token");
        localStorage.removeItem("restaurant_admin_user");
        setManagedRestaurants([]);
        setSelectedRestaurantId(null);
        setOrders([]);
        return null;
      }

      if (response.status === 403) {
        const message = data?.error?.message ?? "Tài khoản không có quyền truy cập nhà hàng.";
        setApiError(message);
        setManagedRestaurants([]);
        setSelectedRestaurantId(null);
        setOrders([]);
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
  }, [managerId, resolvedToken]);

  const fetchOrders = useCallback(
    async (targetRestaurantId: number | null) => {
      if (!resolvedToken) {
        return;
      }

      try {
        setListLoading(true);
        setApiError(null);

        const url = new URL(`${API_ROOT}/orders/manager`);
        if (typeof targetRestaurantId === "number" && Number.isFinite(targetRestaurantId)) {
          url.searchParams.append("filters[restaurant][id][$eq]", String(targetRestaurantId));
        }

        if (startDate) {
          url.searchParams.append("filters[createdAt][$gte]", `${startDate}T00:00:00.000Z`);
        }

        if (endDate) {
          url.searchParams.append("filters[createdAt][$lte]", `${endDate}T23:59:59.999Z`);
        }

        url.searchParams.append("pagination[pageSize]", "200");
        url.searchParams.append("sort[0]", "createdAt:desc");
        url.searchParams.append("populate[restaurant][fields][0]", "name");

        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${resolvedToken}` },
        });

        const data = await response
          .json()
          .catch(() => ({}));

        if (response.status === 401) {
          setApiError("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
          localStorage.removeItem("restaurant_admin_token");
          localStorage.removeItem("restaurant_admin_user");
          setOrders([]);
          return;
        }

        if (response.status === 403) {
          const message = data?.error?.message ?? "Bạn không có quyền xem dữ liệu doanh thu của nhà hàng này.";
          setApiError(message);
          setOrders([]);
          return;
        }

        if (!response.ok) {
          throw new Error(data?.error?.message ?? "Không thể tải dữ liệu doanh thu.");
        }

        const parsed: RevenueOrder[] = Array.isArray(data?.data)
          ? data.data.map((entry: any) => mapOrder(entry))
          : [];
        setOrders(parsed);
      } catch (error: any) {
        setApiError(error?.message ?? "Có lỗi khi tải dữ liệu doanh thu.");
      } finally {
        setListLoading(false);
      }
    },
    [endDate, resolvedToken, startDate]
  );

  useEffect(() => {
    fetchManagedRestaurants();
  }, [fetchManagedRestaurants]);

  useEffect(() => {
    if (typeof selectedRestaurantId !== "number" || !Number.isFinite(selectedRestaurantId)) {
      return;
    }
    fetchOrders(selectedRestaurantId);
  }, [fetchOrders, selectedRestaurantId]);

  const paidOrders = useMemo(() => orders.filter((order) => order.paymentStatus === "paid"), [orders]);
  const deliveredOrders = useMemo(
    () => orders.filter((order) => order.status === "delivered"),
    [orders]
  );

  const totalRevenue = useMemo(
    () => paidOrders.reduce((sum, order) => sum + order.total, 0),
    [paidOrders]
  );

  const totalOrders = orders.length;
  const totalPaidOrders = paidOrders.length;
  const totalDeliveredOrders = deliveredOrders.length;
  const averageOrderValue = totalPaidOrders > 0 ? totalRevenue / totalPaidOrders : 0;

  const now = useMemo(() => new Date(), []);
  const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const monthlyRevenue = useMemo(() => {
    return paidOrders.reduce((acc, order) => {
      if (!order.createdAt) {
        return acc;
      }
      const date = new Date(order.createdAt);
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
      return key === currentMonthKey ? acc + order.total : acc;
    }, 0);
  }, [currentMonthKey, paidOrders]);

  const dailySeries = useMemo<DailyRevenuePoint[]>(() => {
    const map = new Map<string, { revenue: number; orders: number }>();

    paidOrders.forEach((order) => {
      if (!order.createdAt) {
        return;
      }

      const date = new Date(order.createdAt);
      const key = date.toISOString().slice(0, 10);
      const entry = map.get(key) ?? { revenue: 0, orders: 0 };
      entry.revenue += order.total;
      entry.orders += 1;
      map.set(key, entry);
    });

    const sorted = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return sorted.map(([key, value]) => {
      const date = new Date(key);
      const label = dateFormatter.format(date);
      return { date: key, label, revenue: value.revenue, orders: value.orders };
    });
  }, [paidOrders]);

  const maxDailyRevenue = useMemo(() => {
    const values = dailySeries.map((item) => item.revenue);
    if (values.length === 0) {
      return 0;
    }
    return Math.max(...values);
  }, [dailySeries]);

  const selectedRestaurantLabel = useMemo(() => {
    if (managedRestaurants.length === 0) {
      return null;
    }

    if (typeof selectedRestaurantId === "number") {
      const matched = managedRestaurants.find((restaurant) => restaurant.id === selectedRestaurantId);
      if (matched) {
        return `Đang xem doanh thu của ${matched.name}.`;
      }
    }

    return null;
  }, [managedRestaurants, selectedRestaurantId]);

  if (tokenMissing) {
    return <p>⛔ Vui lòng đăng nhập để xem doanh thu.</p>;
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <h2
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#e25a00",
            marginBottom: 6,
          }}
        >
          📈 Doanh thu
        </h2>
        <p style={{ color: "#6b7280" }}>
          Theo dõi doanh thu được xác nhận thanh toán và hiệu suất đơn hàng theo thời gian.
        </p>
      </div>

      {apiError && <p style={{ color: "#dc2626", marginBottom: 12 }}>{apiError}</p>}

      {selectedRestaurantLabel && (
        <p style={{ color: "#6b7280", marginBottom: 16 }}>{selectedRestaurantLabel}</p>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 24,
          alignItems: "flex-end",
        }}
      >
        {managedRestaurants.length > 1 && (
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>Nhà hàng</span>
            <select
              value={selectedRestaurantId ?? ""}
              onChange={(event) => {
                const value = Number(event.target.value);
                setSelectedRestaurantId(Number.isFinite(value) ? value : null);
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #ffcfa9",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
                outline: "none",
                fontFamily: "inherit",
                fontSize: 14,
                background: "white",
                appearance: "none",
                backgroundImage:
                  "linear-gradient(45deg, transparent 50%, #ff6f2c 50%), linear-gradient(135deg, #ff6f2c 50%, transparent 50%)",
                backgroundPosition: "calc(100% - 20px) calc(1.1em), calc(100% - 15px) calc(1.1em)",
                backgroundSize: "5px 5px, 5px 5px",
                backgroundRepeat: "no-repeat",
              }}
            >
              {managedRestaurants.map((restaurant) => (
                <option key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>Từ ngày</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #ffcfa9",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
              outline: "none",
              fontFamily: "inherit",
              fontSize: 14,
            }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>Đến ngày</span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #ffcfa9",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
              outline: "none",
              fontFamily: "inherit",
              fontSize: 14,
            }}
          />
        </label>

        <button
          type="button"
          onClick={() => {
            if (typeof selectedRestaurantId === "number" && Number.isFinite(selectedRestaurantId)) {
              fetchOrders(selectedRestaurantId);
            }
          }}
          disabled={listLoading}
          style={{
            background: "#ff6f2c",
            color: "white",
            border: "none",
            borderRadius: 9999,
            padding: "10px 22px",
            fontWeight: 600,
            cursor: listLoading ? "not-allowed" : "pointer",
            opacity: listLoading ? 0.7 : 1,
            marginLeft: "auto",
          }}
        >
          {listLoading ? "Đang tải..." : "Làm mới"}
        </button>

        {(startDate || endDate) && (
          <button
            type="button"
            onClick={() => {
              setStartDate("");
              setEndDate("");
              if (typeof selectedRestaurantId === "number" && Number.isFinite(selectedRestaurantId)) {
                fetchOrders(selectedRestaurantId);
              }
            }}
            style={{
              background: "white",
              color: "#e25a00",
              borderRadius: 9999,
              border: "1px solid #ffcfa9",
              padding: "10px 22px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Xoá bộ lọc ngày
          </button>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <SummaryCard label="Tổng doanh thu" value={currencyFormatter.format(totalRevenue)} accent="#ff6f2c" />
        <SummaryCard label="Doanh thu tháng này" value={currencyFormatter.format(monthlyRevenue)} accent="#0ea5e9" />
        <SummaryCard label="Đơn đã thanh toán" value={totalPaidOrders} accent="#10b981" />
        <SummaryCard label="Đơn đã giao" value={totalDeliveredOrders} accent="#6366f1" />
        <SummaryCard label="Giá trị trung bình" value={currencyFormatter.format(averageOrderValue || 0)} accent="#f59e0b" />
        <SummaryCard label="Tổng đơn" value={totalOrders} accent="#6b7280" />
      </div>

      <div
        style={{
          background: "white",
          border: "1px solid #ffcfa9",
          borderRadius: 16,
          padding: 20,
          boxShadow: "0 8px 24px rgba(255,138,31,0.06)",
          marginBottom: 24,
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#e25a00", marginBottom: 16 }}>
          Doanh thu theo ngày
        </h3>

        {listLoading ? (
          <p>Đang tổng hợp dữ liệu...</p>
        ) : dailySeries.length === 0 ? (
          <p style={{ color: "#6b7280" }}>Chưa có đơn nào được thanh toán trong khoảng thời gian này.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {dailySeries.map((point) => (
              <div key={point.date} style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                  <span style={{ color: "#374151" }}>{point.label}</span>
                  <span style={{ color: "#ff6f2c" }}>{currencyFormatter.format(point.revenue)}</span>
                </div>
                <div
                  style={{
                    position: "relative",
                    background: "#fff3eb",
                    borderRadius: 9999,
                    height: 14,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: `${maxDailyRevenue > 0 ? Math.max((point.revenue / maxDailyRevenue) * 100, 4) : 4}%`,
                      background: "linear-gradient(90deg, #ff6f2c, #f97316)",
                      borderRadius: 9999,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <div style={{ color: "#6b7280", fontSize: 12 }}>{point.orders} đơn đã thanh toán</div>
              </div>
            ))}
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
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#e25a00", marginBottom: 16 }}>
          Chi tiết đơn đã thanh toán
        </h3>

        {listLoading ? (
          <p>Đang tải danh sách đơn...</p>
        ) : paidOrders.length === 0 ? (
          <p style={{ color: "#6b7280" }}>Chưa có đơn hàng nào được thanh toán.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", background: "#fff0e2" }}>
                  <th style={{ padding: "10px 12px", fontWeight: 600, color: "#e25a00" }}>Mã đơn</th>
                  <th style={{ padding: "10px 12px", fontWeight: 600, color: "#e25a00" }}>Nhà hàng</th>
                  <th style={{ padding: "10px 12px", fontWeight: 600, color: "#e25a00" }}>Ngày tạo</th>
                  <th style={{ padding: "10px 12px", fontWeight: 600, color: "#e25a00" }}>Trạng thái</th>
                  <th style={{ padding: "10px 12px", fontWeight: 600, color: "#e25a00" }}>Thanh toán</th>
                  <th style={{ padding: "10px 12px", fontWeight: 600, color: "#e25a00" }}>Giá trị</th>
                </tr>
              </thead>
              <tbody>
                {paidOrders.map((order) => (
                  <tr key={order.id} style={{ borderTop: "1px solid #ffe2c7" }}>
                    <td style={{ padding: "12px", fontWeight: 600 }}>#{order.id}</td>
                    <td style={{ padding: "12px", color: "#6b7280" }}>{order.restaurant.name}</td>
                    <td style={{ padding: "12px", color: "#6b7280" }}>
                      {order.createdAt ? dateFormatter.format(new Date(order.createdAt)) : "—"}
                    </td>
                    <td style={{ padding: "12px", color: order.status === "delivered" ? "#15803d" : "#b45309" }}>
                      {order.status === "delivered" ? "Đã giao" : "Đang xử lý"}
                    </td>
                    <td style={{ padding: "12px", color: "#15803d" }}>Đã thanh toán</td>
                    <td style={{ padding: "12px", color: "#ff6f2c", fontWeight: 600 }}>
                      {currencyFormatter.format(order.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
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
