export const API_URL = process.env.EXPO_PUBLIC_STRAPI_URL ?? "http://localhost:1337";

export const loginRestaurantOwner = async (identifier: string, password: string) => {
  const response = await fetch(`${API_URL}/api/auth/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const message = error?.error?.message ?? "Đăng nhập thất bại";
    throw new Error(message);
  }

  const payload = await response.json();
  if (!payload?.jwt || !payload?.user) {
    throw new Error("Phản hồi không hợp lệ từ máy chủ");
  }

  // Log để debug role name
  console.log("User role:", payload.user?.role);

  // optional: đảm bảo user có role chủ nhà hàng
  const roleName = payload.user?.role?.name ?? "";
  const normalizedRole = roleName.toLowerCase().trim();
  
  if (normalizedRole !== "restaurant owner" && normalizedRole !== "restaurantowner") {
    throw new Error(`Tài khoản này không có quyền chủ nhà hàng. Role hiện tại: "${roleName}"`);
  }

  return payload;
};
