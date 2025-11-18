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

      const sanitizedQuery = await this.sanitizeQuery(ctx);
      sanitizedQuery.filters = sanitizedQuery.filters ?? {};
      sanitizedQuery.filters.users_permissions_user = { id: user.id };

      const { results, pagination } = await strapi
        .service('api::order.order')
        .find(sanitizedQuery);

      const sanitizedResults = await this.sanitizeOutput(results, ctx);
      return this.transformResponse(sanitizedResults, { pagination });
    } catch (error) {
      console.error("Error fetching orders:", error);
      return ctx.internalServerError("Кхông thể lấy danh sách đơn hàng");
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
  // 🔹 Lấy tất cả đơn hàng thuộc nhà hàng mà manager quản lý
  async managerFind(ctx) {
    try {
      const { user } = ctx.state;
      if (!user) return ctx.unauthorized("Bạn cần đăng nhập để xem đơn hàng");

      const getManagerRestaurantIds = require("../../../utils/get-manager-restaurant-ids");
      const restaurantIds = await getManagerRestaurantIds(strapi, user.id);

      if (!Array.isArray(restaurantIds) || restaurantIds.length === 0) {
        return [];
      }

      const sanitizedQuery = await this.sanitizeQuery(ctx);
      sanitizedQuery.filters = sanitizedQuery.filters ?? {};
      sanitizedQuery.filters.restaurant = { id: { $in: restaurantIds } };

      const { results, pagination } = await strapi
        .service('api::order.order')
        .find(sanitizedQuery);

      const sanitizedResults = await this.sanitizeOutput(results, ctx);
      return this.transformResponse(sanitizedResults, { pagination });
    } catch (error) {
      console.error("Error fetching manager orders:", error);
      return ctx.internalServerError("Không thể lấy danh sách đơn hàng");
    }
  },

  // 🔹 Lấy chi tiết đơn hàng (manager)
  async managerFindOne(ctx) {
    try {
      const { user } = ctx.state;
      if (!user) return ctx.unauthorized("Bạn cần đăng nhập để xem đơn hàng");

      const { id } = ctx.params;
      const getManagerRestaurantIds = require("../../../utils/get-manager-restaurant-ids");
      const restaurantIds = await getManagerRestaurantIds(strapi, user.id);

      const sanitizedQuery = await this.sanitizeQuery(ctx);
      const entity = await strapi.service('api::order.order').findOne(id, sanitizedQuery);

      if (!entity) return ctx.notFound("Đơn hàng không tồn tại");

      const orderRestaurantId = entity?.restaurant?.id;
      if (!restaurantIds.includes(Number(orderRestaurantId))) {
        return ctx.unauthorized("Bạn không có quyền truy cập đơn hàng này");
      }

      const sanitizedResult = await this.sanitizeOutput(entity, ctx);
      return this.transformResponse(sanitizedResult);
    } catch (error) {
      console.error("Error fetching manager order:", error);
      return ctx.internalServerError("Không thể lấy chi tiết đơn hàng");
    }
  },

  // 🔹 Cập nhật đơn hàng (manager) - PUT /api/orders/:id/manager
  async managerUpdate(ctx) {
    try {
      const { user } = ctx.state;
      if (!user) return ctx.unauthorized("Bạn cần đăng nhập để cập nhật đơn hàng");

      const { id } = ctx.params;
      const updateData = ctx.request.body?.data ?? ctx.request.body;

      const getManagerRestaurantIds = require("../../../utils/get-manager-restaurant-ids");
      const restaurantIds = await getManagerRestaurantIds(strapi, user.id);

      const existing = await strapi.db.query("api::order.order").findOne({ 
        where: { id }, 
        populate: { restaurant: true } 
      });
      
      if (!existing) return ctx.notFound("Đơn hàng không tồn tại");

      const orderRestaurantId = existing?.restaurant?.id;
      if (!restaurantIds.includes(Number(orderRestaurantId))) {
        return ctx.unauthorized("Bạn không có quyền cập nhật đơn hàng này");
      }

      const updated = await strapi.db.query("api::order.order").update({
        where: { id },
        data: updateData,
        populate: { 
          restaurant: true, 
          users_permissions_user: true,
          order_items: {
            populate: {
              dish: true
            }
          }
        },
      });

      if (strapi.io) {
        strapi.io.emit("order:update", updated);
      }

      const sanitizedResult = await this.sanitizeOutput(updated, ctx);
      return this.transformResponse(sanitizedResult);
    } catch (error) {
      console.error("Error updating manager order:", error);
      return ctx.internalServerError("Không thể cập nhật đơn hàng");
    }
  },
}));
