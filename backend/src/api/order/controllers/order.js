// D:\food-delivery\backend\src\api\order\controllers\order.js
"use strict";

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  // ==================================================
  // PUBLIC: Lấy order theo orderID (string UID)
  // GET /api/orders/by-order-id/:orderID
  // ==================================================
  async findByOrderID(ctx) {
    const orderID = ctx.params.orderID;

    try {
      console.log('[order.findByOrderID] params:', ctx.params);

      const orders = await strapi.entityService.findMany("api::order.order", {
        filters: { orderID },
        populate: {
          restaurant: true,
          users_permissions_user: true,
          items: {
            populate: ["dish"],
          },
        },
        limit: 1,
      });

      if (!orders.length) {
        console.warn('[order.findByOrderID] not found for', orderID);
        return ctx.notFound("Order not found");
      }

      return { data: orders[0] };
    } catch (err) {
      console.error('[order.findByOrderID] error:', err);
      // Return a 400 with error message for easier debugging (temporary)
      return ctx.badRequest('Error fetching order', { detail: err.message || err });
    }
  },

  // ==================================================
  // User lấy danh sách đơn
  // ==================================================
  async find(ctx) {
    const { user } = ctx.state;
    if (!user) return ctx.unauthorized("Bạn cần đăng nhập");

    const orders = await strapi.entityService.findMany("api::order.order", {
      filters: { users_permissions_user: user.id },
      populate: {
        restaurant: true,
        items: { populate: ["dish"] },
      },
      sort: { createdAt: "DESC" },
    });

    return { data: orders };
  },

  // ==================================================
  // User tạo đơn (nếu dùng flow không VNPAY)
  // ==================================================
  async create(ctx) {
    const { user } = ctx.state;
    if (!user) return ctx.unauthorized("Bạn cần đăng nhập");

    const data = ctx.request.body;

    const newOrder = await strapi.entityService.create("api::order.order", {
      data: {
        ...data,
        users_permissions_user: user.id,
        statusOrder: "pending",
      },
    });
    const simulator = strapi.service("api::drone-simulator.drone-simulator");
    simulator.simulate(strapi, newOrder);
    return { data: newOrder };
  },

  // ==================================================
  // Manager: lấy danh sách đơn theo restaurant
  // ==================================================
  async managerFind(ctx) {
    const restaurantId = ctx.query.restaurantId;
    if (!restaurantId) return ctx.badRequest("Missing restaurantId");

    const orders = await strapi.entityService.findMany("api::order.order", {
      filters: { restaurant: restaurantId },
      populate: {
        items: { populate: ["dish"] },
        restaurant: true,
        users_permissions_user: true,
      },
      sort: { createdAt: "DESC" },
    });

    return { data: orders };
  },

  // ==================================================
  // Manager xem chi tiết 1 đơn
  // ==================================================
  async managerFindOne(ctx) {
    const id = ctx.params.id;

    const order = await strapi.entityService.findOne("api::order.order", id, {
      populate: {
        items: { populate: ["dish"] },
        restaurant: true,
        users_permissions_user: true,
      },
    });

    if (!order) return ctx.notFound("Order not found");

    return { data: order };
  },

  // ==================================================
  // Manager cập nhật đơn + trigger drone simulator
  // PUT /api/orders/manager/:id
  // ==================================================
  async managerUpdate(ctx) {
    const id = ctx.params.id;

    const incoming = ctx.request?.body?.data ?? ctx.request?.body ?? {};

    const allowed = {};

    if (typeof incoming.statusOrder !== "undefined") {
      allowed.statusOrder = incoming.statusOrder;
    }

    if (typeof incoming.note !== "undefined") {
      allowed.note = incoming.note;
    }

    if (typeof incoming.paymentStatus !== "undefined") {
      console.warn(
        `[WARN] Ignoring paymentStatus update attempt by manager for Order ${id}`
      );
    }

    const updated = await strapi.entityService.update("api::order.order", id, {
      data: allowed,
    });

    // Nếu đơn được confirm => mô phỏng drone
    if (allowed.statusOrder === "confirmed") {
      try {
        const droneSimulator = require("../../drone-simulator/services/drone-simulator");
        droneSimulator.simulate(strapi, updated);
      } catch (err) {
        console.error("Drone simulator error:", err);
      }
    }

    return { data: updated };
  },

  // ==================================================
  // Khách xác nhận đơn đã nhận hàng
  // ==================================================
  async customerConfirm(ctx) {
    const { user } = ctx.state;
    if (!user) return ctx.unauthorized("Bạn cần đăng nhập");

    const id = ctx.params.id;

    const order = await strapi.entityService.findOne("api::order.order", id, {
      populate: { users_permissions_user: true },
    });

    if (!order) return ctx.notFound("Order not found");

    if (order.users_permissions_user.id !== user.id) {
      return ctx.unauthorized("Bạn không sở hữu đơn hàng này");
    }

    // Cập nhật trạng thái
    const updated = await strapi.entityService.update(
      "api::order.order",
      id,
      {
        data: { statusOrder: "delivered" },
      }
    );

    // Emit socket realtime
    if (strapi.io) {
      strapi.io.emit("orderDelivered", {
        orderId: updated.id,
        status: "delivered",
      });
    }

    return { data: updated };
  },
}));
