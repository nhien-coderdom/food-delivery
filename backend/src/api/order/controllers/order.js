"use strict";
const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  // ==================================================
  // GET /api/orders/by-order-id/:orderID
  // ==================================================
  async findByOrderID(ctx) {
    const orderID = ctx.params.orderID;

    try {
      const orders = await strapi.entityService.findMany("api::order.order", {
        filters: { orderID },
        populate: {
          restaurant: {
            populate: ["image"]
          },
          drone: true,
          users_permissions_user: true,
          order_items: {
            populate: {
              dish: { populate: ["image"] },
            },
          },
        },
        limit: 1,
      });

      if (!orders.length) return ctx.notFound("Order not found");

      return { data: orders[0] };
    } catch (err) {
      console.error("findByOrderID error:", err);
      return ctx.badRequest("Error fetching order");
    }
  },

  // ==================================================
  // USER orders list
  // ==================================================
  async find(ctx) {
    const { user } = ctx.state;
    if (!user) return ctx.unauthorized("Login required");

    const orders = await strapi.entityService.findMany("api::order.order", {
      filters: { users_permissions_user: user.id },
      populate: {
        restaurant: {
            populate: ["image"]
          },
        drone: true,
        order_items: {
          populate: {
            dish: { populate: ["image"] },
          },
        },
      },
      sort: { createdAt: "DESC" },
    });

    return { data: orders };
  },

  // ==================================================
  // MANAGER LIST ORDERS
  // ==================================================
  async managerFind(ctx) {
    const restaurantId = ctx.query.restaurantId;
    if (!restaurantId) return ctx.badRequest("Missing restaurantId");

    const orders = await strapi.entityService.findMany("api::order.order", {
      filters: { restaurant: restaurantId },
      populate: {
        restaurant: {
            populate: ["image"]
          },
        drone: true,
        users_permissions_user: true,
        order_items: {
          populate: {
            dish: { populate: ["image"] },
          },
        },
      },
      sort: { createdAt: "DESC" },
    });

    return { data: orders };
  },

  async managerFindOne(ctx) {
    const id = ctx.params.id;

    const order = await strapi.entityService.findOne("api::order.order", id, {
      populate: {
        restaurant: {
            populate: ["image"]
          },
        drone: true,
        users_permissions_user: true,
        order_items: {
          populate: {
            dish: { populate: ["image"] },
          },
        },
      },
    });

    if (!order) return ctx.notFound("Order not found");

    return { data: order };
  },

  // ==================================================
  // MANAGER UPDATE ORDER
  // ==================================================
  async managerUpdate(ctx) {
    const id = ctx.params.id;

    // ⭐ BODY FIX — luôn luôn đọc đúng JSON từ FE
    const body = ctx.request.body?.data ?? ctx.request.body ?? {};
    console.log("📦 Body received:", body);

    const allowed = {};

    // ⭐ CHỈ GÁN NẾU FE GỬI LÊN
    if ("statusOrder" in body) allowed.statusOrder = body.statusOrder;
    if ("paymentStatus" in body) allowed.paymentStatus = body.paymentStatus;
    if ("note" in body) allowed.note = body.note;

    // ⭐ Update + populate ĐỦ CHUẨN FE CẦN
    const updated = await strapi.entityService.update("api::order.order", id, {
      data: allowed,
      populate: {
        restaurant: {
            populate: ["image"]
          },
        drone: true,
        users_permissions_user: true,
        order_items: {
          populate: {
            dish: {
              populate: ["image"],
            },
          },
        },
      },
    });

    console.log("✅ Updated order:", updated.orderID, updated.statusOrder);

    // ⭐ Gửi realtime
    if (strapi.io) {
      strapi.io.emit("order:update", {
        orderID: updated.orderID,
        statusOrder: updated.statusOrder,
        paymentStatus: updated.paymentStatus,
        drone: updated.drone,
      });
    }

    // ==================================================
    // 🚁 AUTO START DRONE KHI READY
    // ==================================================
    if (allowed.statusOrder === "ready") {
      console.log("🚀 Auto-start drone (READY) for order", updated.orderID);

      // Lấy lại order đầy đủ (restaurant + drone)
      let order = await strapi.entityService.findOne("api::order.order", id, {
        populate: ["restaurant", "drone"],
      });

      let drone = order.drone;

      // --------------------------------------------------
      // Assign drone nếu chưa có
      // --------------------------------------------------
      if (!drone) {
        drone = await strapi.db.query("api::drone.drone").findOne({
          where: { state: "free" },
        });

        if (!drone) {
          console.log("❌ Không có drone rảnh");
          return { data: updated };
        }

        // Gán drone cho order, KHÔNG đổi status (vẫn ready)
        await strapi.db.query("api::order.order").update({
          where: { id },
          data: { drone: drone.id },
        });

        // Reload order để có drone populate
        order = await strapi.entityService.findOne("api::order.order", id, {
          populate: ["restaurant", "drone"],
        });
      }

      // Reload drone để lấy isSimulating
      const realDrone = await strapi.entityService.findOne(
        "api::drone.drone",
        order.drone.id
      );

      if (realDrone.isSimulating) {
        console.log("⛔ Drone đang chạy → Không chạy lại");
        return { data: updated };
      }

      console.log("🔥 Bắt đầu mô phỏng drone từ READY");
      const sim = strapi.service("api::drone.drone");
      sim.simulate(strapi, realDrone, order);
    }

    return { data: updated };
  },

  // ==================================================
  // CUSTOMER CONFIRM DELIVERED
  // ==================================================
  async customerConfirm(ctx) {
  const id = ctx.params.id;

  const order = await strapi.entityService.findOne("api::order.order", id, {
    populate: ["drone"],
  });

  if (!order) return ctx.notFound("Order not found");

  // 1. Mark delivered
  const updated = await strapi.entityService.update("api::order.order", id, {
    data: { statusOrder: "delivered" },
  });

  // 2. Bắt drone bay về kho
  if (order.drone) {
    const droneService = strapi.service("api::drone.drone");
    droneService.returnToWarehouse(strapi, order.drone, order);
  }

  if (strapi.io) {
    strapi.io.emit("order:update", {
      orderID: updated.orderID,
      statusOrder: "delivered",
    });
  }

  return { data: updated };
},


  // ==================================================
  // MANUAL DRONE TRIGGER
  // ==================================================
  async triggerDrone(ctx) {
    const { orderId } = ctx.params;

    let order = await strapi.db.query("api::order.order").findOne({
      where: { orderID: orderId },
      populate: { restaurant: true, drone: true },
    });

    if (!order) return ctx.notFound("Order not found");

    // 👉 Trigger thủ công CHỈ khi order đang ở trạng thái "ready"
    if (order.statusOrder !== "ready")
      return ctx.badRequest("Order is not ready");

    let drone = order.drone;

    if (!drone) {
      drone = await strapi.db.query("api::drone.drone").findOne({
        where: { state: "free" },
      });

      if (!drone) return ctx.badRequest("No drone available");

      await strapi.db.query("api::order.order").update({
        where: { id: order.id },
        data: { drone: drone.id },
      });

      order = await strapi.entityService.findOne(
        "api::order.order",
        order.id,
        {
          populate: ["restaurant", "drone"],
        }
      );
    }

    const droneFull = await strapi.entityService.findOne(
      "api::drone.drone",
      drone.id
    );
    if (droneFull.isSimulating) {
      return ctx.send({ message: "Drone already running" });
    }

    const droneService = strapi.service("api::drone.drone");
    droneService.simulate(strapi, droneFull, order);

    return ctx.send({
      message: "Drone started",
      droneID: order.drone.droneID,
    });
  },
}));
