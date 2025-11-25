'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const getManagerRestaurantIds = require('../../../utils/get-manager-restaurant-ids');

module.exports = createCoreController('api::restaurant.restaurant', ({ strapi }) => ({

  // ==========================================================
  // LIST RESTAURANTS
  // ==========================================================
  async find(ctx) {
    const { user } = ctx.state;

    const sanitizedQuery = await this.sanitizeQuery(ctx);
    sanitizedQuery.filters = sanitizedQuery.filters ?? {};

    // Nếu có user đăng nhập → check vai trò
    if (user) {
      const role = user.role?.name;

      // ===============================================
      // Manager -> Chỉ xem nhà hàng của mình
      // ===============================================
      if (role === "manager") {
        const managedRestaurantIds = await getManagerRestaurantIds(strapi, user.id);

        if (managedRestaurantIds.length === 0) {
          // Manager nhưng không có nhà hàng
          sanitizedQuery.filters.id = { $in: [] };
        } else {
          sanitizedQuery.filters.id = {
            ...(sanitizedQuery.filters.id ?? {}),
            $in: managedRestaurantIds,
          };
        }
      }

      // ===============================================
      // Admin -> thấy tất cả
      // ===============================================
      else if (role === "admin") {
        // không cần lọc
      }

      // ===============================================
      // Customer -> được xem toàn bộ để đặt hàng
      // ===============================================
      else if (role === "customer") {
        // để nguyên danh sách, khách xem đầy đủ
      }
    }

    // Nếu không đăng nhập -> public xem toàn bộ
    const { results, pagination } = await strapi
      .service('api::restaurant.restaurant')
      .find(sanitizedQuery);

    const sanitizedResults = await this.sanitizeOutput(results, ctx);
    return this.transformResponse(sanitizedResults, { pagination });
  },

  // ==========================================================
  // VIEW ONE RESTAURANT
  // ==========================================================
  async findOne(ctx) {
    const { user } = ctx.state;
    const { id } = ctx.params;

    const restaurant = await strapi.entityService.findOne(
      'api::restaurant.restaurant',
      id,
      { populate: { manager: true } }
    );

    if (!restaurant) {
      return ctx.notFound('Không tìm thấy nhà hàng.');
    }

    // Nếu là manager → chỉ được xem nhà hàng của họ
    if (user && user.role?.name === "manager") {
      if (restaurant.manager?.id !== user.id) {
        return ctx.forbidden('Bạn không có quyền xem nhà hàng này.');
      }
    }

    // Customer & public -> được xem tự nhiên
    const sanitized = await this.sanitizeOutput(restaurant, ctx);
    return this.transformResponse(sanitized);
  },

  // ==========================================================
  // UPDATE RESTAURANT (manager only)
  // ==========================================================
  async update(ctx) {
    const { user } = ctx.state;
    const { id } = ctx.params;

    if (!user) {
      return ctx.unauthorized('Bạn cần đăng nhập.');
    }

    const role = user.role?.name;

    // Customer không thể chỉnh sửa
    if (role === "customer") {
      return ctx.forbidden('Khách hàng không có quyền cập nhật nhà hàng.');
    }

    const restaurant = await strapi.entityService.findOne(
      'api::restaurant.restaurant',
      id,
      { populate: { manager: true } }
    );

    if (!restaurant) {
      return ctx.notFound('Không tìm thấy nhà hàng.');
    }

    // Manager -> chỉ sửa nhà hàng của mình
    if (role === "manager" && restaurant.manager?.id !== user.id) {
      return ctx.forbidden('Bạn không có quyền chỉnh sửa nhà hàng này.');
    }

    const submittedData = ctx.request?.body?.data ?? {};
    const allowedFields = ['name', 'address', 'phone'];

    const filteredData = Object.fromEntries(
      Object.entries(submittedData).filter(([key]) => allowedFields.includes(key))
    );

    if (Object.keys(filteredData).length === 0) {
      return ctx.badRequest('Không có dữ liệu hợp lệ để cập nhật.');
    }

    const updated = await strapi.entityService.update(
      'api::restaurant.restaurant',
      id,
      { data: filteredData }
    );

    const sanitized = await this.sanitizeOutput(updated, ctx);
    return this.transformResponse(sanitized);
  },

}));
