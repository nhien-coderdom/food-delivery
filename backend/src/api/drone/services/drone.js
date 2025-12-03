"use strict";

module.exports = {
  async simulate(strapi, drone, order) {
    try {
      if (drone.isSimulating) {
        console.log(`⚠️ Drone ${drone.droneID} is already running → skip`);
        return;
      }

      // Lock drone
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

      // 3 bước đầu → warehouse → restaurant → customer
      const routeToCustomer = [warehouse, restaurant, customer];

      order.route = [];

      // Emit full route
      strapi.io.to(`order_${order.orderID}`).emit("drone:route", {
        orderID: order.orderID,
        droneID: drone.droneID,
        route: [...routeToCustomer],
      });

      // LOOP tới khách hàng
      for (let i = 0; i < routeToCustomer.length; i++) {
        const p = routeToCustomer[i];

        // Update drone
        await strapi.db.query("api::drone.drone").update({
          where: { id: drone.id },
          data: { droneLocation: p },
        });

        // Update route
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

        // 🟡 Tới nhà hàng → đổi trạng thái thành delivering
        if (i === 1 && order.statusOrder === "ready") {
          await strapi.db.query("api::order.order").update({
            where: { id: order.id },
            data: { statusOrder: "delivering" },
          });

          strapi.io.emit("order:update", {
            orderID: order.orderID,
            statusOrder: "delivering",
          });
        }

        await new Promise((r) => setTimeout(r, 2000));
      }

      // 🛑 TỚI KHÁCH HÀNG → DỪNG DRONE TẠI ĐÂY
      console.log("🛑 Drone đã tới khách hàng. Chờ client xác nhận 'Đã nhận hàng'.");

      await strapi.db.query("api::drone.drone").update({
        where: { id: drone.id },
        data: { isSimulating: false },            // dừng mô phỏng tạm thời
      });

      // Emit event drone dừng
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
