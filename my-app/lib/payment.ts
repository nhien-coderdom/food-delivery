export const createVnpPayment = async (amount: number) => {
  const res = await fetch(`${process.env.EXPO_PUBLIC_STRAPI_URL}/api/vnpay/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount,
      orderId: Date.now().toString(),
    }),
  });

  return res.json();
};
