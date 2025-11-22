"use strict";

module.exports = {
  async simulate(ctx) {
    try {
      const { order } = ctx.request.body;

      if (!order) {
        return ctx.badRequest("Missing order object");
      }

      // Gọi service simulate
      await strapi
        .service("api::drone-simulator.drone-simulator")
        .simulate(strapi, order);

      return { message: "Drone simulation started" };

    } catch (err) {
      console.error("❌ Drone simulate error:", err);
      return ctx.internalServerError("Simulation failed");
    }
  },
};
