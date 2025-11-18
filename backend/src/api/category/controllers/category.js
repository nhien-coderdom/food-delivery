'use strict';

/**
 * category controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const getManagerRestaurantIds = require('../../../utils/get-manager-restaurant-ids');

module.exports = createCoreController('api::category.category', ({ strapi }) => ({
	async find(ctx) {
		const { user } = ctx.state;

		if (!user) {
			return ctx.unauthorized('Bạn cần đăng nhập để xem danh mục.');
		}

		const managedRestaurantIds = await getManagerRestaurantIds(strapi, user.id);

		if (managedRestaurantIds.length === 0) {
			return this.transformResponse([], { pagination: { page: 1, pageSize: 10, pageCount: 0, total: 0 } });
		}

		const sanitizedQuery = await this.sanitizeQuery(ctx);

		const { results, pagination } = await strapi.service('api::category.category').find(sanitizedQuery);
		const sanitizedResults = await this.sanitizeOutput(results, ctx);

		return this.transformResponse(sanitizedResults, { pagination });
	},

	async findOne(ctx) {
		const { user } = ctx.state;

		if (!user) {
			return ctx.unauthorized('Bạn cần đăng nhập để xem danh mục.');
		}

		const { id } = ctx.params;

		const category = await strapi.entityService.findOne('api::category.category', id);

		if (!category) {
			return ctx.notFound('Không tìm thấy danh mục đã yêu cầu.');
		}

		const sanitizedEntity = await this.sanitizeOutput(category, ctx);
		return this.transformResponse(sanitizedEntity);
	},
}));
