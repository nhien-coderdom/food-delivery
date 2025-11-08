export const createVnpPayment = async (amount: number) => {
  const orderId = `ORD${Date.now()}`; // ví dụ: ORD1731061823456
  const res = await fetch("http://localhost:1337/api/vnpay/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, orderId }),
  });
  return res.json();
};