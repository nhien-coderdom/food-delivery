"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/orders/by-order-id/:orderID",
      handler: "order.findByOrderID",
      config: {
        auth: false,
      },
    },
  ],
};
