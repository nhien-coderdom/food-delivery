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
    {
      method: "POST",
      path: "/orders/trigger-drone/:orderID",
      handler: "order.triggerDrone",
      config: { auth: false },   // hoặc auth: true tùy bạn
    },
    {
      method: "GET",
      path: "/orders",
      handler: "order.find",
      config: {
        auth: {
          scope: ["api::order.order.find"],
        },
      },
    },

  ],
};
