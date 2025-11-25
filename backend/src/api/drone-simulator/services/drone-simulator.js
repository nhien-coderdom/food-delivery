"use strict";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = {
  async simulate(strapi, order) {
    const io = strapi.io;
    if (!io) return;

    const orderID = order.orderID; // 🔥 BẮT BUỘC PHẢI CÓ

    const warehouse = { lat: 10.8001, lng: 106.7002 };
    const restaurant = order.restaurant.location;
    const customer = order.customerLocation;

    const fullRoute = [warehouse, restaurant, customer, warehouse];

    console.log("🚁 Drone route for order:", orderID);

    // Gửi route tĩnh trước
    io.to("order_" + orderID).emit("drone:route", fullRoute);

    for (let i = 0; i < fullRoute.length - 1; i++) {
      const p1 = fullRoute[i];
      const p2 = fullRoute[i + 1];

      for (let step = 0; step <= 20; step++) {
        const t = step / 20;
        const lat = p1.lat + (p2.lat - p1.lat) * t;
        const lng = p1.lng + (p2.lng - p1.lng) * t;

        io.to("order_" + orderID).emit("drone:position", {
          orderID,
          lat,
          lng,
        });

        await sleep(1000);
      }
    }

    io.to("order_" + orderID).emit("drone:done", { orderID });

  },
};
