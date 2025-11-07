module.exports = {
  routes: [
    { method: "POST", path: "/vnpay/create", handler: "vnpay.create" },
    { method: "GET",  path: "/vnpay/return", handler: "vnpay.return" },
    { method: "GET",  path: "/vnpay/ipn",    handler: "vnpay.ipn" }
  ],
};
