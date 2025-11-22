'use strict';

const TICK_MS = 800;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function buildPath(from, to, steps = 80) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({
      lat: lerp(from.lat, to.lat, t),
      lng: lerp(from.lng, to.lng, t),
    });
  }
  return points;
}

module.exports = {
  async simulate(strapi, order) {
    const depot = { lat: 10.754507, lng: 106.667766 };

    const restaurant = await strapi.db
      .query("api::restaurant.restaurant")
      .findOne({
        where: { id: order.restaurant },
        select: ["location"],
      });

    const pickup = restaurant.location;
    const drop = order.customerLocation;

    const path = [
      ...buildPath(depot, pickup, 40),  
      ...buildPath(pickup, drop, 60),   
      ...buildPath(drop, depot, 60),    
    ];

    let i = 0;

    await strapi.db.query("api::order.order").update({
      where: { id: order.id },
      data: { statusOrder: "shipping-to-restaurant" }
    });

    const timer = setInterval(async () => {
      if (i >= path.length) {
        clearInterval(timer);

        await strapi.db.query("api::order.order").update({
          where: { id: order.id },
          data: { statusOrder: "delivered" },
        });

        strapi.io.emit("drone:done", { orderId: order.id });
        return;
      }

      const pos = path[i];
      i++;

      let phase = "";

      if (i < 40) phase = "to-restaurant";
      else if (i < 100) phase = "to-customer";
      else phase = "returning-base";

      if (i === 40) {
        await strapi.db.query("api::order.order").update({
          where: { id: order.id },
          data: { statusOrder: "shipping-to-customer" }
        });
      }

      if (i === 100) {
        await strapi.db.query("api::order.order").update({
          where: { id: order.id },
          data: { statusOrder: "delivered" }
        });
      }

      await strapi.db.query("api::order.order").update({
        where: { id: order.id },
        data: { drone_location: pos },
      });

      strapi.io.emit("drone:position", {
        orderId: order.id,
        lat: pos.lat,
        lng: pos.lng,
        phase,
      });
    }, TICK_MS);
  },
};
