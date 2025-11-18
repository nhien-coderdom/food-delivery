import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, FormEvent, ReactNode } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:1337";

type MenuManagementProps = {
  token?: string | null;
  user?: { id?: number | null } | null;
};

type CategoryOption = {
  id: number;
  name: string;
};

type Dish = {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image: { id: number; url: string } | null;
  category: CategoryOption | null;
};

type FormState = {
  name: string;
  description: string;
  price: string;
  stock: string;
  categoryId: string;
};

const emptyFormState: FormState = {
  name: "",
  description: "",
  price: "",
  stock: "",
  categoryId: "",
};

const dishCurrency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

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

const textareaControlStyle: CSSProperties = {
  ...baseControlStyle,
  resize: "vertical",
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

const sortByName = <T extends { name: string }>(items: T[]) =>
  [...items].sort((a, b) => a.name.localeCompare(b.name, "vi", { sensitivity: "base" }));

const resolveMediaUrl = (rawUrl: unknown): string | null => {
  if (typeof rawUrl !== "string" || rawUrl.trim() === "") {
    return null;
  }

  if (/^https?:/i.test(rawUrl)) {
    return rawUrl;
  }

  const normalizedApi = API_URL.replace(/\/$/, "");
  const normalizedPath = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
  return `${normalizedApi}${normalizedPath}`;
};

const mapCategory = (raw: any): CategoryOption => {
  const attributes = (raw?.attributes ?? {}) as Record<string, unknown>;
  const id = Number(raw?.id ?? attributes?.id) || 0;

  const nameCandidates = [
    attributes?.name,
    raw?.name,
  ];

  const resolvedName = nameCandidates.find((candidate) => typeof candidate === "string" && candidate.trim() !== "");

  return { id, name: resolvedName ? String(resolvedName) : "Danh mục" };
};

const mapDish = (raw: any): Dish => {
  const attributesSource = (raw?.attributes && typeof raw.attributes === "object") ? raw.attributes : raw;
  const attributes = (attributesSource ?? {}) as Record<string, unknown>;

  const categoryCandidates = [
    (attributes as any)?.category?.data,
    (raw as any)?.category?.data,
    (attributes as any)?.category,
    (raw as any)?.category,
  ];

  const categoryEntry = categoryCandidates.find((candidate) => candidate && typeof candidate === "object");

  const imageCandidates = [
    (attributes as any)?.image?.data,
    (raw as any)?.image?.data,
    (attributes as any)?.image,
    (raw as any)?.image,
  ];

  const imageEntry = imageCandidates.find((candidate) => candidate && typeof candidate === "object");
  const imageAttributesSource = (imageEntry as any)?.attributes ?? imageEntry;
  const imageIdRaw = (imageEntry as any)?.id ?? imageAttributesSource?.id;
  const imageUrlRaw = imageAttributesSource?.url ?? (imageEntry as any)?.url;
  const resolvedImageUrl = resolveMediaUrl(imageUrlRaw);
  const numericImageId = Number(imageIdRaw);

  const priceValue = Number((attributes as any)?.price ?? (raw as any)?.price ?? 0);
  const stockValue = Number((attributes as any)?.stock ?? (raw as any)?.stock ?? 0);

  const nameCandidates = [attributes?.name, raw?.name];
  const descriptionCandidates = [attributes?.description, raw?.description];

  const resolvedName = nameCandidates.find((value) => typeof value === "string" && value.trim() !== "");
  const resolvedDescription = descriptionCandidates.find(
    (value) => typeof value === "string" && value.trim() !== ""
  );

  return {
    id: Number(raw?.id ?? attributes?.id) || 0,
    name: resolvedName ? String(resolvedName) : "Món chưa đặt tên",
    description: resolvedDescription ? String(resolvedDescription) : "",
    price: Number.isFinite(priceValue) ? priceValue : 0,
    stock: Number.isFinite(stockValue) ? stockValue : 0,
    image: resolvedImageUrl && Number.isFinite(numericImageId)
      ? { id: numericImageId, url: resolvedImageUrl }
      : null,
    category: categoryEntry ? mapCategory(categoryEntry) : null,
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

export default function MenuManagement({ token: tokenProp, user: userProp }: MenuManagementProps) {
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

  const managerId = useMemo(() => {
    return extractManagerId(resolvedUser);
  }, [resolvedUser]);

  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [formState, setFormState] = useState<FormState>(emptyFormState);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [activeDishId, setActiveDishId] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageId, setExistingImageId] = useState<number | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const feedbackTimeoutRef = useRef<number | null>(null);
  const imageObjectUrlRef = useRef<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const releaseImagePreview = useCallback(() => {
    if (imageObjectUrlRef.current) {
      URL.revokeObjectURL(imageObjectUrlRef.current);
      imageObjectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = null;
      }
      releaseImagePreview();
    };
  }, [releaseImagePreview]);

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

  const resetForm = useCallback(() => {
    setFormState(emptyFormState);
    setFormErrors([]);
    setFormMode("create");
    setActiveDishId(null);
    setImageFile(null);
    setExistingImageId(null);
    setExistingImageUrl(null);
    setImagePreview(null);
    setRemoveImage(false);
    releaseImagePreview();
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }, [releaseImagePreview]);

  const fetchRestaurant = useCallback(async () => {
    if (!resolvedToken || !managerId) {
      setApiError("Không tìm thấy thông tin đăng nhập quản lý.");
      return;
    }

    try {
      setApiError(null);

      const url = new URL(`${API_URL}/api/restaurants`);
      url.searchParams.append("fields[0]", "name");
      url.searchParams.append("fields[1]", "address");
      url.searchParams.append("fields[2]", "phone");

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${resolvedToken}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message ?? "Không thể lấy thông tin nhà hàng.");
      }

      const restaurant = Array.isArray(data?.data) ? data.data[0] : undefined;

      if (!restaurant) {
        setRestaurantId(null);
        setDishes([]);
        setCategories([]);
        setApiError("Tài khoản này chưa được gán vào nhà hàng nào.");
        return;
      }

      const resolvedId = Number((restaurant as any)?.id ?? (restaurant as any)?.attributes?.id ?? null);
      setRestaurantId(Number.isFinite(resolvedId) ? resolvedId : null);
    } catch (error: any) {
      setApiError(error?.message ?? "Có lỗi xảy ra khi tải thông tin nhà hàng.");
    }
  }, [managerId, resolvedToken]);

  const fetchCategories = useCallback(async (targetRestaurantId?: number | null) => {
    if (!resolvedToken) {
      return;
    }

    try {
      const url = new URL(`${API_URL}/api/categories`);
      url.searchParams.append("fields[0]", "name");
      url.searchParams.append("sort[0]", "name");

      if (Number.isFinite(targetRestaurantId)) {
        const restaurantFilterValue = String(targetRestaurantId);
        url.searchParams.append("filters[$or][0][restaurants][id][$eq]", restaurantFilterValue);
        url.searchParams.append(
          "filters[$or][1][dishes][restaurant][id][$eq]",
          restaurantFilterValue
        );
      }

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${resolvedToken}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message ?? "Không thể tải danh mục.");
      }

      const parsed = Array.isArray(data?.data) ? data.data.map(mapCategory) : [];
      setCategories(sortByName(parsed));
    } catch (error: any) {
      setApiError(error?.message ?? "Có lỗi khi tải danh mục món ăn.");
    }
  }, [resolvedToken]);

  const fetchDishes = useCallback(
    async (targetRestaurantId: number) => {
      if (!resolvedToken) {
        return;
      }

      try {
        setListLoading(true);

        const url = new URL(`${API_URL}/api/dishes`);
        url.searchParams.append("filters[restaurant][id][$eq]", String(targetRestaurantId));
        url.searchParams.append("sort[0]", "name");
        url.searchParams.append("populate[category][fields][0]", "name");
        url.searchParams.append("populate[image]", "true");

        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${resolvedToken}` },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error?.message ?? "Không thể tải món ăn.");
        }

        const parsed = Array.isArray(data?.data) ? data.data.map(mapDish) : [];
        setDishes(sortByName(parsed));
      } catch (error: any) {
        setApiError(error?.message ?? "Có lỗi khi tải danh sách món ăn.");
      } finally {
        setListLoading(false);
      }
    },
    [resolvedToken]
  );

  useEffect(() => {
    fetchRestaurant();
  }, [fetchRestaurant]);

  useEffect(() => {
    if (!categoryFilter.trim()) {
      return;
    }

    const normalizedFilter = categoryFilter.trim();
    const hasCategory = categories.some((category) => String(category.id) === normalizedFilter);
    if (!hasCategory) {
      setCategoryFilter("");
    }
  }, [categories, categoryFilter]);

  useEffect(() => {
    if (!restaurantId) {
      return;
    }

    fetchCategories(restaurantId);
    fetchDishes(restaurantId);
  }, [restaurantId, fetchCategories, fetchDishes]);

  const handleFieldChange = useCallback((field: keyof FormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleImageSelection = useCallback(
    (file: File) => {
      releaseImagePreview();
      const objectUrl = URL.createObjectURL(file);
      imageObjectUrlRef.current = objectUrl;
      setImageFile(file);
      setImagePreview(objectUrl);
      setRemoveImage(false);
    },
    [releaseImagePreview]
  );

  const handleImageInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleImageSelection(file);
      } else {
        releaseImagePreview();
        setImageFile(null);
        setImagePreview(null);
        setRemoveImage(false);
        if (imageInputRef.current) {
          imageInputRef.current.value = "";
        }
      }
    },
    [handleImageSelection, releaseImagePreview]
  );

  const handleRemoveImageClick = useCallback(() => {
    releaseImagePreview();
    setImageFile(null);
    setImagePreview(null);
    setExistingImageId(null);
    setExistingImageUrl(null);
    setRemoveImage(true);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }, [releaseImagePreview]);

  const handleEditDish = useCallback((dish: Dish) => {
    setFormMode("edit");
    setActiveDishId(dish.id);
    setFormErrors([]);
    setFormState({
      name: dish.name,
      description: dish.description,
      price: dish.price ? String(dish.price) : "",
      stock: dish.stock || dish.stock === 0 ? String(dish.stock) : "",
      categoryId: dish.category ? String(dish.category.id) : "",
    });
    releaseImagePreview();
    setImageFile(null);
    setExistingImageId(dish.image ? dish.image.id : null);
    setExistingImageUrl(dish.image ? dish.image.url : null);
    setImagePreview(null);
    setRemoveImage(false);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }, [releaseImagePreview]);

  const handleDeleteDish = useCallback(
    async (id: number) => {
      if (!resolvedToken) {
        setApiError("Thiếu token xác thực.");
        return;
      }

      const confirmed = window.confirm("Bạn có chắc muốn xoá món ăn này?");
      if (!confirmed) {
        return;
      }

      try {
        setDeletingId(id);
        setApiError(null);

        const response = await fetch(`${API_URL}/api/dishes/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${resolvedToken}`,
          },
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result?.error?.message ?? "Không thể xoá món ăn.");
        }

        setDishes((prev) => prev.filter((dish) => dish.id !== id));

        if (formMode === "edit" && activeDishId === id) {
          resetForm();
        }

        showFeedback("Đã xoá món ăn.");
      } catch (error: any) {
        setApiError(error?.message ?? "Có lỗi xảy ra khi xoá món ăn.");
      } finally {
        setDeletingId(null);
      }
    },
    [activeDishId, formMode, resetForm, resolvedToken, showFeedback]
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!resolvedToken) {
        setApiError("Thiếu token xác thực.");
        return;
      }

      if (!restaurantId) {
        setApiError("Không xác định được nhà hàng để gán món ăn.");
        return;
      }

      const trimmedName = formState.name.trim();
      const trimmedDescription = formState.description.trim();
      const priceValue = Number(formState.price);
      const parsedStock = Number(formState.stock);
      const stockValue = Number.isNaN(parsedStock) || formState.stock === "" ? 0 : parsedStock;

      const errors: string[] = [];

      if (!trimmedName) {
        errors.push("Tên món không được để trống.");
      }

      if (!Number.isFinite(priceValue) || priceValue <= 0) {
        errors.push("Giá món phải lớn hơn 0.");
      }

      if (!Number.isInteger(stockValue) || stockValue < 0) {
        errors.push("Số lượng tồn phải là số nguyên không âm.");
      }

      if (errors.length > 0) {
        setFormErrors(errors);
        return;
      }

      setFormErrors([]);
      setProcessing(true);
      setApiError(null);

      const dataPayload: Record<string, unknown> = {
        name: trimmedName,
        description: trimmedDescription || null,
        price: priceValue,
        stock: stockValue,
        restaurant: restaurantId,
        category: formState.categoryId ? Number(formState.categoryId) : null,
      };

      if (removeImage) {
        dataPayload.image = null;
      } else if (!imageFile && existingImageId) {
        dataPayload.image = existingImageId;
      }

      const editingDishId = formMode === "edit" && activeDishId !== null ? activeDishId : null;
      const isEditing = editingDishId !== null;

      let body: BodyInit;
      const headers: Record<string, string> = {
        Authorization: `Bearer ${resolvedToken}`,
      };

      if (imageFile) {
        const formData = new FormData();
        formData.append("data", JSON.stringify(dataPayload));
        formData.append("files.image", imageFile);
        body = formData;
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify({ data: dataPayload });
      }

      try {
        const response = await fetch(
          isEditing ? `${API_URL}/api/dishes/${editingDishId}` : `${API_URL}/api/dishes`,
          {
            method: isEditing ? "PUT" : "POST",
            headers,
            body,
          }
        );

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result?.error?.message ?? "Không thể lưu món ăn.");
        }

        await fetchDishes(restaurantId);
        showFeedback(isEditing ? "Đã cập nhật món ăn." : "Đã thêm món ăn mới.");
        resetForm();
      } catch (error: any) {
        setApiError(error?.message ?? "Có lỗi xảy ra khi lưu món ăn.");
      } finally {
        setProcessing(false);
      }
    },
    [
      activeDishId,
      formMode,
      formState.categoryId,
      formState.description,
      formState.name,
      formState.price,
      formState.stock,
      existingImageId,
      imageFile,
      removeImage,
      fetchDishes,
      resetForm,
      resolvedToken,
      restaurantId,
      showFeedback,
    ]
  );

  const tokenMissing = !resolvedToken || !managerId;

  const filteredDishes = useMemo(() => {
    const normalizedFilter = categoryFilter.trim();
    if (!normalizedFilter) {
      return dishes;
    }

    return dishes.filter((dish) => {
      const dishCategoryId = dish.category?.id;
      if (dishCategoryId === undefined || dishCategoryId === null) {
        return false;
      }

      return String(dishCategoryId) === normalizedFilter;
    });
  }, [categoryFilter, dishes]);

  const currentImagePreview = imagePreview ?? (existingImageUrl && !removeImage ? existingImageUrl : null);

  if (tokenMissing) {
    return <p>⛔ Vui lòng đăng nhập để quản lý menu.</p>;
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
          🍽️ Quản lý menu
        </h2>
        <p style={{ color: "#6b7280" }}>Thêm, chỉnh sửa món ăn trong thực đơn của nhà hàng.</p>
      </div>

      {apiError && (
        <p style={{ color: "#dc2626", marginBottom: 12 }}>{apiError}</p>
      )}
      {feedback && <p style={{ color: "#16a34a", marginBottom: 12 }}>{feedback}</p>}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            flex: "1 1 320px",
            background: "#fff5eb",
            border: "1px solid #ffcfa9",
            borderRadius: 16,
            padding: 20,
            boxShadow: "0 8px 24px rgba(255,138,31,0.08)",
          }}
        >
          <h3 style={{ fontSize: 20, fontWeight: 700, color: "#e25a00", marginBottom: 12 }}>
            {formMode === "create" ? "Thêm món ăn mới" : "Chỉnh sửa món ăn"}
          </h3>

          {formErrors.length > 0 && (
            <ul style={{ color: "#dc2626", marginBottom: 12, paddingLeft: 18 }}>
              {formErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}

          <FormField label="Tên món" required>
            <input
              value={formState.name}
              onChange={(event) => handleFieldChange("name", event.target.value)}
              placeholder="Ví dụ: Trà sữa trân châu"
              style={baseControlStyle}
            />
          </FormField>

          <FormField label="Mô tả">
            <textarea
              value={formState.description}
              onChange={(event) => handleFieldChange("description", event.target.value)}
              placeholder="Mô tả ngắn gọn về món ăn"
              rows={3}
              style={textareaControlStyle}
            />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
            <FormField label="Giá (VND)" required>
              <input
                type="number"
                min="0"
                step="1000"
                value={formState.price}
                onChange={(event) => handleFieldChange("price", event.target.value)}
                placeholder="100000"
                style={baseControlStyle}
              />
            </FormField>
            <FormField label="Tồn kho" required>
              <input
                type="number"
                min="0"
                step="1"
                value={formState.stock}
                onChange={(event) => handleFieldChange("stock", event.target.value)}
                placeholder="10"
                style={baseControlStyle}
              />
            </FormField>
          </div>

          <FormField label="Danh mục">
            <select
              value={formState.categoryId}
              onChange={(event) => handleFieldChange("categoryId", event.target.value)}
              style={selectControlStyle}
            >
              <option value=""></option>
              {categories.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Hình ảnh">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {currentImagePreview ? (
                <div style={{ position: "relative", maxWidth: 220 }}>
                  <img
                    src={currentImagePreview}
                    alt="Hình ảnh món"
                    style={{
                      display: "block",
                      width: "100%",
                      maxHeight: 160,
                      objectFit: "cover",
                      borderRadius: 14,
                      border: "1px solid #ffe2c7",
                      boxShadow: "0 4px 18px rgba(255,138,31,0.12)",
                    }}
                  />
                    <span
                      style={{
                        position: "absolute",
                        left: 10,
                        bottom: 10,
                        background: "rgba(255,255,255,0.85)",
                        color: "#b45309",
                        borderRadius: 9999,
                        padding: "2px 10px",
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                      }}
                    >
                      {imagePreview ? "Ảnh mới" : "Ảnh hiện tại"}
                    </span>
                  <button
                    type="button"
                    onClick={handleRemoveImageClick}
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      background: "rgba(0,0,0,0.6)",
                      color: "white",
                      border: "none",
                      borderRadius: 9999,
                      padding: "4px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Xoá ảnh
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "#6b7280" }}></div>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageInputChange}
                style={baseControlStyle}
              />
              {removeImage && (
                <span style={{ color: "#dc2626", fontSize: 12 }}>
                  Ảnh hiện tại sẽ được xoá khi lưu thay đổi.
                </span>
              )}
            </div>
          </FormField>

          <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={processing}
              style={{
                background: "#ff6f2c",
                color: "white",
                borderRadius: 9999,
                border: "none",
                padding: "10px 22px",
                fontWeight: 600,
                cursor: processing ? "not-allowed" : "pointer",
                opacity: processing ? 0.7 : 1,
              }}
            >
              {processing ? "Đang lưu..." : formMode === "create" ? "Thêm món" : "Lưu thay đổi"}
            </button>

            {formMode === "edit" && (
              <button
                type="button"
                onClick={resetForm}
                style={{
                  background: "white",
                  color: "#ff6f2c",
                  borderRadius: 9999,
                  border: "1px solid #ff6f2c",
                  padding: "10px 22px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Huỷ chỉnh sửa
              </button>
            )}
          </div>
        </form>

        <div
          style={{
            flex: "2 1 420px",
            background: "white",
            border: "1px solid #ffcfa9",
            borderRadius: 16,
            padding: 20,
            boxShadow: "0 8px 24px rgba(255,138,31,0.06)",
            minHeight: 360,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "#e25a00" }}>Danh sách món ăn</h3>
            <span style={{ color: "#6b7280", fontSize: 14 }}>Tổng: {dishes.length}</span>
            <div style={{ marginLeft: "auto", minWidth: 200 }}>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                style={selectControlStyle}
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {listLoading ? (
            <p>Đang tải danh sách món ăn...</p>
          ) : filteredDishes.length === 0 ? (
            <p style={{ color: "#6b7280" }}>
              {categoryFilter ? "Không có món nào thuộc danh mục này." : "Chưa có món ăn nào. Hãy thêm món đầu tiên!"}
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", background: "#fff0e2" }}>
                    <th style={{ padding: "10px 12px", fontWeight: 600, color: "#e25a00" }}>Hình ảnh</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, color: "#e25a00" }}>Tên món</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, color: "#e25a00" }}>Danh mục</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, color: "#e25a00" }}>Giá</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, color: "#e25a00" }}>Tồn</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, color: "#e25a00" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDishes.map((dish) => {
                    const isSelected = formMode === "edit" && activeDishId === dish.id;
                    return (
                      <tr
                        key={dish.id}
                        style={{
                          background: isSelected ? "#fff5eb" : "transparent",
                          borderTop: "1px solid #ffe2c7",
                        }}
                      >
                        <td style={{ padding: "12px", verticalAlign: "top" }}>
                          {dish.image ? (
                            <img
                              src={dish.image.url}
                              alt={`Hình ảnh của ${dish.name}`}
                              style={{
                                width: 72,
                                height: 72,
                                objectFit: "cover",
                                borderRadius: 12,
                                border: "1px solid #ffe2c7",
                                boxShadow: "0 4px 12px rgba(255,138,31,0.15)",
                              }}
                            />
                          ) : (
                            <span style={{ color: "#9ca3af", fontSize: 13 }}>Không có</span>
                          )}
                        </td>
                        <td style={{ padding: "12px", verticalAlign: "top" }}>
                          <div style={{ fontWeight: 600 }}>{dish.name}</div>
                          {dish.description && (
                            <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>{dish.description}</div>
                          )}
                        </td>
                        <td style={{ padding: "12px", verticalAlign: "top", color: "#6b7280" }}>
                          {dish.category ? dish.category.name : "Không phân loại"}
                        </td>
                        <td style={{ padding: "12px", verticalAlign: "top", color: "#ff6f2c", fontWeight: 600 }}>
                          {dishCurrency.format(dish.price)}
                        </td>
                        <td style={{ padding: "12px", verticalAlign: "top" }}>{dish.stock}</td>
                        <td style={{ padding: "12px", verticalAlign: "top" }}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => handleEditDish(dish)}
                              style={{
                                background: "white",
                                color: "#1aa179",
                                border: "1px solid #1aa179",
                                borderRadius: 9999,
                                padding: "6px 14px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDish(dish.id)}
                              disabled={deletingId === dish.id}
                              style={{
                                background: "white",
                                color: "#dc2626",
                                border: "1px solid #dc2626",
                                borderRadius: 9999,
                                padding: "6px 14px",
                                fontWeight: 600,
                                cursor: deletingId === dish.id ? "not-allowed" : "pointer",
                                opacity: deletingId === dish.id ? 0.7 : 1,
                              }}
                            >
                              {deletingId === dish.id ? "Đang xoá..." : "Xoá"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
  required,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label style={{ display: "block", marginBottom: 16 }}>
      <span style={{ display: "block", fontWeight: 600, marginBottom: 6, color: "#374151" }}>
        {label}
        {required ? <span style={{ color: "#dc2626" }}> *</span> : null}
      </span>
      {children}
    </label>
  );
}
