"use strict";

module.exports = {
  async assign(ctx) {
    const { droneID, orderID } = ctx.request.body;

    if (!droneID || !orderID) return ctx.badRequest("Missing parameters");

    const drone = await strapi.db.query("api::drone.drone").findOne({
      where: { droneID }
    });

    if (!drone) return ctx.notFound("Drone not found");
    if (drone.state !== "free") return ctx.badRequest("Drone is not free");

    await strapi.db.query("api::order.order").update({
      where: { orderID },
      data: { drone: drone.id }
    });

    await strapi.db.query("api::drone.drone").update({
      where: { droneID },
      data: { state: "busy" }
    });

    return { message: `Assigned drone ${droneID} → order ${orderID}` };
  },

  async start(ctx) {
    const { droneID, orderID } = ctx.request.body;

    let drone = await strapi.db.query("api::drone.drone").findOne({
      where: { droneID },
      populate: ["orders", "orders.restaurant"]
    });

    if (!drone) return ctx.notFound("Drone not found");

    if (drone.isSimulating) {
      return ctx.send({ message: "Drone is already flying – skipped" });
    }

    const order = drone.orders.find((o) => o.orderID === orderID);
    if (!order) return ctx.badRequest("Order is not assigned to drone");

    const sim = strapi.service("api::drone.drone");
    sim.simulate(strapi, drone, order);

    return { message: "Simulation started" };
  },

  async list(ctx) {
    const drones = await strapi.db.query("api::drone.drone").findMany();
    return { data: drones };
  }
};
