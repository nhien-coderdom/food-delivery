import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type RestaurantInfoProps = {
  token?: string | null;
  user?: { id?: number | null } | null;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://172.20.10.3:1337";

export default function RestaurantInfo({ token: tokenProp, user: userProp }: RestaurantInfoProps) {
  const safeGetLocalStorage = useCallback((key: string) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("LocalStorage access blocked or unavailable for key:", key, e);
      return null;
    }
  }, []);

  const token = useMemo(() => {
    if (typeof tokenProp === "string") {
      return tokenProp;
    }
    return safeGetLocalStorage("restaurant_admin_token");
  }, [tokenProp, safeGetLocalStorage]);

  const user = useMemo(() => {
    if (userProp) {
      return userProp;
    }
    const stored = safeGetLocalStorage("restaurant_admin_user");
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
  const [image, setImage] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedName, setSavedName] = useState("");
  const [savedAddress, setSavedAddress] = useState("");
  const [savedPhone, setSavedPhone] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedField, setSavedField] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [showPhoneValidIndicator, setShowPhoneValidIndicator] = useState(false);

  const successTimeoutRef = useRef<number | null>(null);
  const phoneValidTimeoutRef = useRef<number | null>(null);
  const savedFieldTimeoutRef = useRef<number | null>(null);

  const normalizePhoneInput = useCallback((value: string) => value.replace(/\D/g, ""), []);

  const resolveMediaUrl = useCallback((media: any) => {
    if (!media) return null;
    // If Strapi returns a plain string URL
    if (typeof media === "string") {
      return media.startsWith("http") ? media : `${API_URL}${media}`;
    }

    // Handle v4 media object shapes
    const url = media?.data?.attributes?.url ?? media?.attributes?.url ?? media?.url ?? null;
    if (!url) return null;
    return url.startsWith("http") ? url : `${API_URL}${url}`;
  }, []);

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
      // Ask Strapi to populate the media relation so we receive nested media attributes (url, etc.)
      url.searchParams.append("populate", "image");
      // Request the basic fields as well
      url.searchParams.append("fields[0]", "name");
      url.searchParams.append("fields[1]", "address");
      url.searchParams.append("fields[2]", "phone");

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Dữ liệu nhà hàng không tìm thấy (404). URL: ${url.toString()}`);
        }
        throw new Error(data?.error?.message ?? `Không thể tải dữ liệu (status ${response.status})`);
      }

      const restaurant = Array.isArray(data?.data) ? data.data[0] : undefined;

      if (!restaurant) {
        setError("Tài khoản này chưa được gán vào nhà hàng nào.");
        return;
      }

      const attributes = (restaurant as any)?.attributes ?? restaurant ?? {};
      const resolvedId = (restaurant as any)?.id ?? attributes?.id ?? null;

      setRestaurantId(typeof resolvedId === "number" ? resolvedId : null);
      const resolvedImage = resolveMediaUrl(attributes?.image ?? null);
      setImage(resolvedImage ?? "");
      setImagePreviewUrl(resolvedImage || null);
      setName(typeof attributes?.name === "string" ? attributes.name : "");
      setAddress(typeof attributes?.address === "string" ? attributes.address : "");
      const phoneValue = typeof attributes?.phone === "string" ? attributes.phone : "";
      setPhone(phoneValue);
      setSavedName(typeof attributes?.name === "string" ? attributes.name : "");
      setSavedAddress(typeof attributes?.address === "string" ? attributes.address : "");
      setSavedPhone(phoneValue);
      setValidationMessage(getPhoneValidationMessage(phoneValue));
    } catch (err: any) {
      setSuccess(null);
      setError(err?.message ?? "Lỗi khi tải dữ liệu nhà hàng.");
    }
  }, [getPhoneValidationMessage, token, user?.id]);

  const handleImageSelect = useCallback((file: File | null) => {
    if (!file) {
      setImageFile(null);
      setImagePreviewUrl(null);
      return;
    }
    setImageFile(file);
    try {
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
    } catch (e) {
      setImagePreviewUrl(null);
    }
  }, []);

  const handleCancelEditImage = useCallback(() => {
    setIsEditingImage(false);
    if (imageFile) {
      setImageFile(null);
    }
    setImagePreviewUrl(image || null);
  }, [image, imageFile]);

  const handleImageUpload = useCallback(async () => {
    if (!imageFile || !token || !restaurantId) {
      return;
    }
    setUploadingImage(true);
    try {
      setError(null);
      const form = new FormData();
      form.append("files", imageFile);

      const uploadResp = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const uploadResult = await uploadResp.json();
      if (!uploadResp.ok) {
        throw new Error(uploadResult?.error?.message ?? "Không thể tải ảnh lên.");
      }

      // Try to obtain uploaded media id
      const uploaded = Array.isArray(uploadResult) ? uploadResult[0] : uploadResult?.data?.[0] ?? uploadResult?.data ?? uploadResult;
      const mediaId = uploaded?.id ?? uploaded?.data?.id ?? null;
      if (!mediaId) {
        throw new Error("Không nhận được id ảnh sau khi tải lên.");
      }

      const payload = { data: { image: mediaId } };
      const updateResp = await fetch(`${API_URL}/api/restaurants/${restaurantId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const updateRes = await updateResp.json();
      if (!updateResp.ok) {
        throw new Error(updateRes?.error?.message ?? "Không thể cập nhật ảnh nhà hàng.");
      }

      const updatedAttributes = (updateRes?.data?.attributes ?? updateRes?.data ?? {}) as any;
      const newImage = resolveMediaUrl(updatedAttributes?.image ?? null);
      setImage(newImage ?? "");
      setImagePreviewUrl(newImage || null);
      setIsEditingImage(false);
      setImageFile(null);
      setSuccess("Ảnh đã được cập nhật.");
      // update saved image state in case other updates rely on it
      setSavedName((prev) => prev);
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current);
      }
      successTimeoutRef.current = window.setTimeout(() => {
        setSuccess(null);
        successTimeoutRef.current = null;
      }, 1500);
    } catch (err: any) {
      setError(err?.message ?? "Lỗi khi tải ảnh lên");
    } finally {
      setUploadingImage(false);
    }
  }, [imageFile, token, restaurantId, image]);


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
      if (savedFieldTimeoutRef.current) {
        window.clearTimeout(savedFieldTimeoutRef.current);
        savedFieldTimeoutRef.current = null;
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

    const updateRestaurantField = useCallback(
      async (field: string, value: string | null) => {
        if (!token || !restaurantId) {
          setError("Thiếu thông tin xác thực.");
          return;
        }

        try {
          setError(null);
          setSuccess(null);
          setSaving(true);

          const payload = { data: { [field]: value ?? null } } as any;

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
            if (response.status === 404) {
              throw new Error(`Không tìm thấy endpoint cập nhật (404): /api/restaurants/${restaurantId}`);
            }
            throw new Error(result?.error?.message ?? `Không thể cập nhật thông tin nhà hàng (status ${response.status}).`);
          }

          const updatedAttributes = (result?.data?.attributes ?? result?.data ?? {}) as any;

          if (field === "name") {
            const newName = typeof updatedAttributes?.name === "string" ? updatedAttributes.name : value ?? "";
            setName(newName);
            setSavedName(newName);
          }
          if (field === "address") {
            const newAddress = typeof updatedAttributes?.address === "string" ? updatedAttributes.address : value ?? "";
            setAddress(newAddress);
            setSavedAddress(newAddress);
          }
          if (field === "phone") {
            const newPhone = typeof updatedAttributes?.phone === "string" ? updatedAttributes.phone : value ?? "";
            setPhone(newPhone);
            setSavedPhone(newPhone);
            const updatedValidation = getPhoneValidationMessage(newPhone ?? "");
            setValidationMessage(updatedValidation);
            schedulePhoneValidIndicator(newPhone ?? "", updatedValidation);
          }

          // show inline saved indicator for the field
          setSavedField(field);
          if (savedFieldTimeoutRef.current) {
            window.clearTimeout(savedFieldTimeoutRef.current);
          }
          savedFieldTimeoutRef.current = window.setTimeout(() => {
            setSavedField(null);
            savedFieldTimeoutRef.current = null;
          }, 1200);

          setSuccess("Đã cập nhật thông tin.");
          if (successTimeoutRef.current) {
            window.clearTimeout(successTimeoutRef.current);
          }
          successTimeoutRef.current = window.setTimeout(() => {
            setSuccess(null);
            successTimeoutRef.current = null;
          }, 1200);
        } catch (err: any) {
          setError(err?.message ?? "Có lỗi khi cập nhật trường.");
        } finally {
          setSaving(false);
        }
      },
      [getPhoneValidationMessage, restaurantId, schedulePhoneValidIndicator, token]
    );

    const handleNameBlur = useCallback(() => {
      if (name !== savedName) {
        void updateRestaurantField("name", name);
      }
    }, [name, savedName, updateRestaurantField]);

    const handleAddressBlur = useCallback(() => {
      if (address !== savedAddress) {
        void updateRestaurantField("address", address);
      }
    }, [address, savedAddress, updateRestaurantField]);

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
    // If valid and changed vs saved value, update single field
    if (!nextValidation && phone !== savedPhone) {
      void updateRestaurantField("phone", phone);
    }
  }, [getPhoneValidationMessage, phone, schedulePhoneValidIndicator, savedPhone]);

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

        {/* Toast notification (appears top-right) */}
        {success && (
          <div
            role="status"
            aria-live="polite"
            onClick={() => setSuccess(null)}
            style={{
              position: "fixed",
              top: 16,
              right: 16,
              background: "#16a34a",
              color: "white",
              padding: "10px 14px",
              borderRadius: 10,
              boxShadow: "0 6px 20px rgba(22,163,74,0.18)",
              zIndex: 9999,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {success}
          </div>
        )}

        {error && <p style={{ color: "#dc2626" }}>{error}</p>}

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

          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
            <div style={{ width: 120, height: 90, borderRadius: 8, overflow: "hidden", background: "#f3f3f3", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {imagePreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreviewUrl} alt="Restaurant" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ color: "#999", fontSize: 12 }}>Chưa có ảnh</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              {!isEditingImage ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingImage(true)}
                    style={{ padding: "8px 12px", borderRadius: 8, background: "#ff6f2c", color: "white", border: "none" }}
                  >
                    Chỉnh sửa ảnh
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageSelect(e.target.files?.[0] ?? null)}
                    style={{ display: "block", marginBottom: 8 }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={handleImageUpload}
                      disabled={uploadingImage || !imageFile}
                      style={{ padding: "8px 12px", borderRadius: 8, background: "#ff6f2c", color: "white", border: "none", cursor: uploadingImage || !imageFile ? "not-allowed" : "pointer" }}
                    >
                      {uploadingImage ? "Đang tải..." : "Tải ảnh lên"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditImage}
                      style={{ padding: "8px 12px", borderRadius: 8, background: "#eee", color: "#333", border: "none" }}
                    >
                      Hủy
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <Field label="Tên nhà hàng" value={name} onChange={setName} onBlur={handleNameBlur} savedIndicator={savedField === "name"} placeholder="Nhập tên nhà hàng" />
          <Field label="Địa chỉ" value={address} onChange={setAddress} onBlur={handleAddressBlur} savedIndicator={savedField === "address"} placeholder="Nhập địa chỉ" />
          <Field
            label="Số điện thoại"
            value={phone}
            onChange={handlePhoneChange}
            onBlur={handlePhoneBlur}
            savedIndicator={savedField === "phone"}
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
  savedIndicator,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  savedIndicator?: boolean;
}) {
  return (
    <label style={{ display: "block", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        {/** inline saved indicator */}
        {typeof savedIndicator !== "undefined" && savedIndicator && (
          <span style={{ color: "#16a34a", fontSize: 12, fontWeight: 600 }}>Đã lưu</span>
        )}
      </div>
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
