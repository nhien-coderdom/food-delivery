"use strict";

module.exports = {
  async simulate(strapi, drone, order) {
    try {
      if (drone.isSimulating) {
        console.log(`⚠️ Drone ${drone.droneID} is already running → skip`);
        return;
      }

      await strapi.db.query("api::drone.drone").update({
        where: { id: drone.id },
        data: { state: "busy", isSimulating: true },
      });

      const warehouse = { lat: 10.760596, lng: 106.681948 };
      const restaurant = order.restaurant?.location;
      const customer = order.customerLocation;

      if (!restaurant || !customer) {
        console.error("❌ Missing location");
        return;
      }

      const routeToCustomer = [warehouse, restaurant, customer];

      // ⭐ HÀM CHIA ĐIỂM
      function interpolatePoints(start, end, steps = 5) {
        const pts = [];
        for (let i = 1; i <= steps; i++) {
          pts.push({
            lat: start.lat + ((end.lat - start.lat) * i) / steps,
            lng: start.lng + ((end.lng - start.lng) * i) / steps,
          });
        }
        return pts;
      }

      // ⭐ Tạo route mượt
      const fullRoute = [];

      for (let i = 0; i < routeToCustomer.length - 1; i++) {
        const from = routeToCustomer[i];
        const to = routeToCustomer[i + 1];

        fullRoute.push(from, ...interpolatePoints(from, to, 5)); // 5 điểm giữa
      }

      // Thêm điểm cuối
      fullRoute.push(routeToCustomer[routeToCustomer.length - 1]);

      // Reset route
      order.route = [];

      // Emit route preview
      strapi.io.to(`order_${order.orderID}`).emit("drone:route", {
        orderID: order.orderID,
        droneID: drone.droneID,
        route: fullRoute,
      });

      // ⭐ LOOP MƯỢT
      for (let i = 0; i < fullRoute.length; i++) {
        const p = fullRoute[i];

        // Lưu drone position
        await strapi.db.query("api::drone.drone").update({
          where: { id: drone.id },
          data: { droneLocation: p },
        });

        // Lưu vào order.route
        order.route.push(p);
        await strapi.db.query("api::order.order").update({
          where: { id: order.id },
          data: { route: order.route },
        });

        // Emit realtime
        strapi.io.to(`order_${order.orderID}`).emit("drone:position", {
          orderID: order.orderID,
          droneID: drone.droneID,
          lat: p.lat,
          lng: p.lng,
          step: i,
        });

        // Đến restaurant → chuyển delivering
        if (i === 6 && order.statusOrder === "ready") {
          await strapi.db.query("api::order.order").update({
            where: { id: order.id },
            data: { statusOrder: "delivering" },
          });

          strapi.io.emit("order:update", {
            orderID: order.orderID,
            statusOrder: "delivering",
          });
        }

        await new Promise((r) => setTimeout(r, 1000)); // 1s mỗi điểm
      }

      console.log("🛑 Drone đã tới khách hàng.");

      await strapi.db.query("api::drone.drone").update({
        where: { id: drone.id },
        data: { isSimulating: false },
      });

      strapi.io.to(`order_${order.orderID}`).emit("drone:arrived", {
        orderID: order.orderID,
        droneID: drone.droneID,
      });

    } catch (err) {
      console.error("❌ Sim error:", err);
      await strapi.db.query("api::drone.drone").update({
        where: { id: drone.id },
        data: { state: "error", isSimulating: false },
      });
    }
  },

  // ⭐ BẮT ĐẦU LẠI ĐỂ BAY VỀ WAREHOUSE SAU KHI CLIENT XÁC NHẬN
  async returnToWarehouse(strapi, drone, order) {
  const warehouse = { lat: 10.760596, lng: 106.681948 };
  const start = drone.droneLocation;

  const routeBack = [start, warehouse];

  console.log("🔄 Drone returning to warehouse...");

  await strapi.db.query("api::drone.drone").update({
    where: { id: drone.id },
    data: { isSimulating: true, state: "busy" },
  });

  // 👉 Đảm bảo order.route tồn tại
  order.route = order.route || [];

  for (const p of routeBack) {

    // 1. Update drone position
    await strapi.db.query("api::drone.drone").update({
      where: { id: drone.id },
      data: { droneLocation: p },
    });

    // 2. Lưu thêm vào order.route (QUAN TRỌNG)
    order.route.push(p);

    await strapi.db.query("api::order.order").update({
      where: { id: order.id },
      data: { route: order.route },
    });

    // 3. Emit realtime
    strapi.io.to(`order_${order.orderID}`).emit("drone:position", {
      orderID: order.orderID,
      droneID: drone.droneID,
      lat: p.lat,
      lng: p.lng,
    });

    await new Promise((r) => setTimeout(r, 2000));
  }

  // 4. Trạng thái drone sau khi xong
  await strapi.db.query("api::drone.drone").update({
    where: { id: drone.id },
    data: { state: "free", isSimulating: false },
  });

  strapi.io.to(`order_${order.orderID}`).emit("drone:done", {
    orderID: order.orderID,
    droneID: drone.droneID,
  });
}
  
};
