"use strict";

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({

  // ==================================================
  // PUBLIC: Lấy order theo orderID (string UID)
  // ==================================================
  async findByOrderID(ctx) {
    const orderID = ctx.params.orderID;

    const orders = await strapi.entityService.findMany("api::order.order", {
      filters: { orderID },
      populate: {
        restaurant: true,
        users_permissions_user: true,
        order_items: {
          populate: ["dish"],   // ✔ CHỈNH ĐÚNG THEO schema order-item
        },
      },
      limit: 1,
    });

    if (!orders.length) return ctx.notFound("Order not found");

    return { data: orders[0] };
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
        order_items: { populate: ["dish"] },  // ✔
      },
      sort: { createdAt: "DESC" },
    });

    return { data: orders };
  },

  // ==================================================
  // User tạo đơn
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
        order_items: { populate: ["dish"] },
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
        order_items: { populate: ["dish"] },
        restaurant: true,
        users_permissions_user: true,
      },
    });

    if (!order) return ctx.notFound("Order not found");

    return { data: order };
  },

  // ==================================================
  // Manager cập nhật đơn + trigger drone simulator
  // ==================================================
  async managerUpdate(ctx) {
    const id = ctx.params.id;
    const data = ctx.request.body;

    const updated = await strapi.entityService.update("api::order.order", id, {
      data,
    });

    if (data.statusOrder === "confirmed") {
      const droneSimulator = require("../../drone-simulator/services/drone-simulator");
      droneSimulator.simulate(strapi, updated);
    }

    return { data: updated };
  },

}));
