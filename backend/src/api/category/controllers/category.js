"use strict";

/**
 * category controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::category.category", ({ strapi }) => ({

  // Customer + Manager đều xem được category → không filter theo restaurant
  async find(ctx) {
    const { user } = ctx.state;

    if (!user) {
      return ctx.unauthorized("Bạn cần đăng nhập để xem danh mục.");
    }

    const sanitizedQuery = await this.sanitizeQuery(ctx);

    // Không áp dụng getManagerRestaurantIds ở categories
    const { results, pagination } = await strapi
      .service("api::category.category")
      .find(sanitizedQuery);

    const sanitizedResults = await this.sanitizeOutput(results, ctx);

    return this.transformResponse(sanitizedResults, { pagination });
  },

  async findOne(ctx) {
    const { user } = ctx.state;

    if (!user) {
      return ctx.unauthorized("Bạn cần đăng nhập để xem danh mục.");
    }

    const { id } = ctx.params;

    const category = await strapi.entityService.findOne(
      "api::category.category",
      id
    );

    if (!category) {
      return ctx.notFound("Không tìm thấy danh mục đã yêu cầu.");
    }

    const sanitizedEntity = await this.sanitizeOutput(category, ctx);
    return this.transformResponse(sanitizedEntity);
  },
}));
