"use strict";

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  // 🔹 Lấy tất cả đơn hàng của user hiện tại
  async find(ctx) {
    try {
      const { user } = ctx.state;
      if (!user) return ctx.unauthorized("Bạn cần đăng nhập để xem đơn hàng");

      const orders = await strapi.db.query("api::order.order").findMany({
        where: { user: user.id },
        populate: { restaurant: true, items: { populate: ["food"] } },
        orderBy: { createdAt: "desc" },
      });

      return orders;
    } catch (error) {
      console.error("Error fetching orders:", error);
      return ctx.internalServerError("Không thể lấy danh sách đơn hàng");
    }
  },

  // 🔹 Tạo đơn hàng mới
  async create(ctx) {
  const { user } = ctx.state;
  if (!user) return ctx.unauthorized("Bạn cần đăng nhập");

  const data = ctx.request.body;

  const newOrder = await strapi.db.query("api::order.order").create({
    data: {
      ...data,
      user: user.id,
      status: "pending",
    },
  });

  const droneSimulator = require("../../../services/drone-simulator");
  droneSimulator.simulate(strapi, newOrder);

  return newOrder;
},
  // 🔹 Cập nhật trạng thái đơn hàng
  async updateStatus(ctx) {
    try {
      const { id } = ctx.params;
      const { status } = ctx.request.body;

      const updated = await strapi.db.query("api::order.order").update({
        where: { id },
        data: { status },
      });

      if (strapi.io) {
        strapi.io.emit("order:update", updated);
      }

      return updated;
    } catch (error) {
      console.error("Error updating order:", error);
      return ctx.internalServerError("Không thể cập nhật trạng thái đơn hàng");
    }
  },
}));
