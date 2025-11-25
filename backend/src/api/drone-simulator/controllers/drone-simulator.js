// D:\food-delivery\backend\src\api\drone-simulator\controllers\drone-simulator.js
"use strict";

module.exports = {
  // POST /api/drone-simulator/simulate
  async simulate(ctx) {
    try {
      const { order } = ctx.request.body;

      if (!order) {
        return ctx.badRequest("Missing order object");
      }

      const simulator = strapi.service("api::drone-simulator.drone-simulator");
      if (!simulator || typeof simulator.simulate !== "function") {
        return ctx.internalServerError("Simulator service not available");
      }

      await simulator.simulate(strapi, order);

      return { message: "Drone simulation started" };
    } catch (err) {
      console.error("❌ Drone simulate error:", err);
      return ctx.internalServerError("Simulation failed");
    }
  },
};