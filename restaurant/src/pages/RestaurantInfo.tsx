import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type RestaurantInfoProps = {
  token?: string | null;
  user?: { id?: number | null } | null;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:1337";

export default function RestaurantInfo({ token: tokenProp, user: userProp }: RestaurantInfoProps) {
  const token = useMemo(() => {
    if (typeof tokenProp === "string") {
      return tokenProp;
    }
    return localStorage.getItem("restaurant_admin_token");
  }, [tokenProp]);

  const user = useMemo(() => {
    if (userProp) {
      return userProp;
    }
    const stored = localStorage.getItem("restaurant_admin_user");
    if (!stored) {
      return null;
    }
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.warn("Không thể parse user từ localStorage", error);
      return null;
    }
  }, [userProp]);

  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [showPhoneValidIndicator, setShowPhoneValidIndicator] = useState(false);

  const successTimeoutRef = useRef<number | null>(null);
  const phoneValidTimeoutRef = useRef<number | null>(null);

  const normalizePhoneInput = useCallback((value: string) => value.replace(/\D/g, ""), []);

  const getPhoneValidationMessage = useCallback(
    (rawValue: string) => {
      const digitsOnly = normalizePhoneInput(rawValue);

      if (digitsOnly.length === 0) {
        return null;
      }

      if (!digitsOnly.startsWith("0")) {
        return "Số điện thoại phải bắt đầu bằng số 0.";
      }

      if (digitsOnly.length < 10) {
        return "Số điện thoại phải có đủ 10 chữ số.";
      }

      if (digitsOnly.length > 10) {
        return "Số điện thoại chỉ gồm 10 chữ số.";
      }

      return null;
    },
    [normalizePhoneInput]
  );

  const phoneIsValid = useMemo(() => !getPhoneValidationMessage(phone), [getPhoneValidationMessage, phone]);

  const fetchRestaurant = useCallback(async () => {
    if (!token || !user?.id) {
      setError("Không tìm thấy thông tin đăng nhập.");
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      const url = new URL(`${API_URL}/api/restaurants`);
      url.searchParams.append("fields[0]", "name");
      url.searchParams.append("fields[1]", "address");
      url.searchParams.append("fields[2]", "phone");

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message ?? "Không thể tải dữ liệu");
      }

      const restaurant = Array.isArray(data?.data) ? data.data[0] : undefined;

      if (!restaurant) {
        setError("Tài khoản này chưa được gán vào nhà hàng nào.");
        return;
      }

      const attributes = (restaurant as any)?.attributes ?? restaurant ?? {};
      const resolvedId = (restaurant as any)?.id ?? attributes?.id ?? null;

      setRestaurantId(typeof resolvedId === "number" ? resolvedId : null);
      setName(typeof attributes?.name === "string" ? attributes.name : "");
      setAddress(typeof attributes?.address === "string" ? attributes.address : "");
      const phoneValue = typeof attributes?.phone === "string" ? attributes.phone : "";
      setPhone(phoneValue);
      setValidationMessage(getPhoneValidationMessage(phoneValue));
    } catch (err: any) {
      setSuccess(null);
      setError(err?.message ?? "Lỗi khi tải dữ liệu nhà hàng.");
    }
  }, [getPhoneValidationMessage, token, user?.id]);

  useEffect(() => {
    fetchRestaurant();
  }, [fetchRestaurant]);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
      if (phoneValidTimeoutRef.current) {
        window.clearTimeout(phoneValidTimeoutRef.current);
        phoneValidTimeoutRef.current = null;
      }
    };
  }, []);

  const schedulePhoneValidIndicator = useCallback(
    (digitsOnly: string, validation: string | null) => {
      if (!validation && digitsOnly) {
        setShowPhoneValidIndicator(true);
        if (phoneValidTimeoutRef.current) {
          window.clearTimeout(phoneValidTimeoutRef.current);
        }
        phoneValidTimeoutRef.current = window.setTimeout(() => {
          setShowPhoneValidIndicator(false);
          phoneValidTimeoutRef.current = null;
        }, 1000);
        return;
      }

      if (phoneValidTimeoutRef.current) {
        window.clearTimeout(phoneValidTimeoutRef.current);
        phoneValidTimeoutRef.current = null;
      }
      setShowPhoneValidIndicator(false);
    },
    []
  );

  const handlePhoneChange = useCallback(
    (value: string) => {
      const digitsOnly = normalizePhoneInput(value);
      const nextValidation = getPhoneValidationMessage(digitsOnly);
      setPhone(digitsOnly);
      setValidationMessage(nextValidation);
      schedulePhoneValidIndicator(digitsOnly, nextValidation);
    },
    [getPhoneValidationMessage, normalizePhoneInput, schedulePhoneValidIndicator]
  );

  const handlePhoneBlur = useCallback(() => {
    const nextValidation = getPhoneValidationMessage(phone);
    setValidationMessage(nextValidation);
    schedulePhoneValidIndicator(phone, nextValidation);
  }, [getPhoneValidationMessage, phone, schedulePhoneValidIndicator]);

  const handleSave = useCallback(async () => {
    if (!token || !user?.id || !restaurantId) {
      setError("Thiếu thông tin xác thực.");
      return;
    }

    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    const digitsOnlyPhone = normalizePhoneInput(phone);
    const latestValidation = getPhoneValidationMessage(phone);

    if (!trimmedName || !trimmedAddress) {
      setValidationMessage(latestValidation);
      setError("Tên và địa chỉ không được để trống.");
      return;
    }

    if (latestValidation) {
      setValidationMessage(latestValidation);
      setError("Vui lòng kiểm tra lại số điện thoại.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload = {
        data: {
          name: trimmedName,
          address: trimmedAddress,
          phone: digitsOnlyPhone || null,
        },
      };

      const response = await fetch(`${API_URL}/api/restaurants/${restaurantId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error?.message ?? "Không thể cập nhật thông tin nhà hàng.");
      }

      const updatedAttributes = (result?.data?.attributes ?? result?.data ?? {}) as Record<string, unknown>;

      setName(typeof updatedAttributes?.name === "string" ? (updatedAttributes.name as string) : trimmedName);
      setAddress(
        typeof updatedAttributes?.address === "string" ? (updatedAttributes.address as string) : trimmedAddress
      );
      const updatedPhone =
        typeof updatedAttributes?.phone === "string" ? (updatedAttributes.phone as string) : digitsOnlyPhone;
      const updatedPhoneValue = updatedPhone ?? "";
      const updatedValidation = getPhoneValidationMessage(updatedPhoneValue);
      setPhone(updatedPhoneValue);
      setValidationMessage(updatedValidation);
      schedulePhoneValidIndicator(updatedPhoneValue, updatedValidation);
      setSuccess("Đã lưu thông tin nhà hàng.");
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current);
      }
      successTimeoutRef.current = window.setTimeout(() => {
        setSuccess(null);
        successTimeoutRef.current = null;
      }, 1000);
    } catch (err: any) {
      setError(err?.message ?? "Có lỗi xảy ra khi lưu thông tin nhà hàng.");
    } finally {
      setSaving(false);
    }
  }, [
    address,
    getPhoneValidationMessage,
    name,
    normalizePhoneInput,
    phone,
    restaurantId,
    token,
    user?.id,
  ]);

  if (!token) {
    return <p>⛔ Vui lòng đăng nhập để xem thông tin nhà hàng.</p>;
  }

  return (
    <div style={{ padding: 20, maxWidth: 600 }}>
      <h2
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: "#e25a00",
          marginBottom: 20,
        }}
      >
        🏪 Thông tin nhà hàng
      </h2>

        {error && <p style={{ color: "#dc2626" }}>{error}</p>}
          {success && <p style={{ color: "#16a34a" }}>{success}</p>}

        {!error && (
        <div
          style={{
            background: "white",
            border: "1px solid #ffcfa9",
            padding: 20,
            borderRadius: 16,
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          }}
        >
          <p style={{ fontWeight: 600, marginBottom: 16 }}>ID Nhà hàng: {restaurantId ?? "—"}</p>

          <Field label="Tên nhà hàng" value={name} onChange={setName} placeholder="Nhập tên nhà hàng" />
          <Field label="Địa chỉ" value={address} onChange={setAddress} placeholder="Nhập địa chỉ" />
          <Field
            label="Số điện thoại"
            value={phone}
            onChange={handlePhoneChange}
            onBlur={handlePhoneBlur}
            placeholder="Ví dụ: 0909123456"
          />
          {validationMessage && (
            <p style={{ color: "#dc2626", marginTop: -12, marginBottom: 12 }}>{validationMessage}</p>
          )}
          {showPhoneValidIndicator && (
            <p style={{ color: "#16a34a", marginTop: -12, marginBottom: 12 }}>Số điện thoại hợp lệ.</p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || (!phoneIsValid && phone.length > 0)}
            style={{
              width: "100%",
              background: "#ff6f2c",
              color: "white",
              padding: "12px 0",
              borderRadius: 12,
              border: "none",
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "block", marginBottom: 16 }}>
      <span style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid #ffcfa9",
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
          outline: "none",
        }}
      />
    </label>
  );
}
