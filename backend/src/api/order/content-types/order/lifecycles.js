"use strict";

module.exports = {
  async afterUpdate(event) {
    try {
      const { result } = event;

      // Nếu trạng thái vừa trở thành 'confirmed' => khởi động drone simulator
      if (result && result.statusOrder === "confirmed") {
        try {
          const droneSimulator = require("../../../drone-simulator/services/drone-simulator");
          // Không chờ simulate (nó đã dùng await internally), gọi non-blocking
          droneSimulator.simulate(strapi, result).catch((e) => {
            console.error("[lifecycles.order] Drone simulate error:", e);
          });
          console.log("[lifecycles.order] Triggered drone simulator for order:", result.orderID || result.id);
        } catch (err) {
          console.error("[lifecycles.order] Failed to require drone simulator:", err);
        }
      }
    } catch (err) {
      console.error("[lifecycles.order] afterUpdate error:", err);
    }
  },
};
