export function formatVND(price) {
  if (typeof price !== "number") price = Number(price);
  if (isNaN(price)) return "0 VND";

  // Nhân 1000 nếu Strapi chỉ lưu đơn vị "nghìn đồng"
  const formatted = price * 1000;

  return formatted.toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0, // Không hiển thị số lẻ
  });
}
