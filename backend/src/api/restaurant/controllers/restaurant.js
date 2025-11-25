"use strict";

const { createCoreController } = require("@strapi/strapi").factories;
const getManagerRestaurantIds = require("../../../utils/get-manager-restaurant-ids");

module.exports = createCoreController("api::restaurant.restaurant", ({ strapi }) => ({
  async find(ctx) {
    const { user } = ctx.state;

    if (!user) return ctx.unauthorized("Bạn cần đăng nhập.");

    const sanitizedQuery = await this.sanitizeQuery(ctx);
    sanitizedQuery.filters = sanitizedQuery.filters ?? {};

    // ❌ Xóa filter sai
    delete sanitizedQuery.filters.manager;
    delete sanitizedQuery.filters.managers;

    // Lấy role người dùng
    const role = user.role?.type;

    if (role === "restaurant-manager-api") {
      // Nếu là Manager → chỉ xem nhà hàng của họ
      const managedIds = await getManagerRestaurantIds(strapi, user.id);

      console.log("🔍 Manager ID:", user.id);
      console.log("🔍 Managed restaurants:", managedIds);

      sanitizedQuery.filters.id = {
        ...(sanitizedQuery.filters.id ?? {}),
        $in: managedIds.length > 0 ? managedIds : [0],
      };
    }

    // Nếu role = "authenticated" (customer) → xem tất cả restaurants
    // Không cần filter

    const { results, pagination } = await strapi
      .service("api::restaurant.restaurant")
      .find(sanitizedQuery);

    const sanitizedResults = await this.sanitizeOutput(results, ctx);
    return this.transformResponse(sanitizedResults, { pagination });
  },

  async findOne(ctx) {
    const { user } = ctx.state;

    if (!user) return ctx.unauthorized("Bạn cần đăng nhập.");

    const { id } = ctx.params;

    const restaurant = await strapi.entityService.findOne("api::restaurant.restaurant", id, {
      populate: { manager: true },
    });

    // Nếu user là customer → cho xem thoải mái
    if (user.role?.type === "authenticated") {
      return this.transformResponse(
        await this.sanitizeOutput(restaurant, ctx)
      );
    }

    // Nếu manager → chỉ xem restaurant họ quản lý
    if (restaurant.manager?.id !== user.id) {
      return ctx.forbidden("Bạn không có quyền truy cập nhà hàng này.");
    }

    return this.transformResponse(await this.sanitizeOutput(restaurant, ctx));
  },
}));
