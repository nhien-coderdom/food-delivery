module.exports = {
  routes: [
    {
      method: "POST",
      path: "/vnpay/create",
      handler: "vnpay.create",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/vnpay/return",
      handler: "vnpay.return",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/vnpay/ipn",
      handler: "vnpay.ipn",
      config: { auth: false },
    },
  ],
};
