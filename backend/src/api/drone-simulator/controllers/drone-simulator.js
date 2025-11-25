"use strict";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

module.exports = {
  async simulate(strapi, order, socketId) {
    try {
      const io = strapi.io; // socket instance

      // 📌 1. Lấy vị trí kho (gốc)
      const warehouse = { lat: 10.8001, lng: 106.7002 };

      // 📌 2. Vị trí nhà hàng
      const restaurant = order.restaurant.location; // phải có field location

      // 📌 3. Vị trí khách
      const customer = order.customerLocation;

      const route = [warehouse, restaurant, customer, warehouse];

      console.log("🚁 Drone route:", route);

      for (let i = 0; i < route.length; i++) {
        const point = route[i];

        // gửi từng điểm cho FE
        io.to(socketId).emit("drone:position", {
          lat: point.lat,
          lng: point.lng,
          step: i + 1,
        });

        await sleep(1500);
      }

      io.to(socketId).emit("drone:done", { success: true });
    } catch (err) {
      console.log("Drone simulator error:", err);
    }
  }
};