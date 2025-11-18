'use strict';

/**
 * restaurant controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const getManagerRestaurantIds = require('../../../utils/get-manager-restaurant-ids');

module.exports = createCoreController('api::restaurant.restaurant', ({ strapi }) => ({
	async find(ctx) {
		const { user } = ctx.state;

		if (!user) {
			return ctx.unauthorized('Bạn cần đăng nhập để xem thông tin nhà hàng.');
		}

		const managedRestaurantIds = await getManagerRestaurantIds(strapi, user.id);
		console.log('🔍 User ID:', user.id);
		console.log('🔍 Managed restaurant IDs:', managedRestaurantIds);

		const sanitizedQuery = await this.sanitizeQuery(ctx);
		sanitizedQuery.filters = sanitizedQuery.filters ?? {};
		
		// Remove any manager/managers filter that might cause "Invalid key" error
		if (sanitizedQuery.filters.manager) {
			delete sanitizedQuery.filters.manager;
		}
		if (sanitizedQuery.filters.managers) {
			delete sanitizedQuery.filters.managers;
		}
		if (sanitizedQuery.filters.managers) {
			delete sanitizedQuery.filters.managers;
		}

		if (managedRestaurantIds.length > 0) {
			sanitizedQuery.filters.id = {
				...(sanitizedQuery.filters.id ?? {}),
				$in: managedRestaurantIds,
			};
		} else {
			sanitizedQuery.filters.id = { $in: [] };
		}

		const { results, pagination } = await strapi
			.service('api::restaurant.restaurant')
			.find(sanitizedQuery);

		const sanitizedResults = await this.sanitizeOutput(results, ctx);
		return this.transformResponse(sanitizedResults, { pagination });
	},

	async findOne(ctx) {
		const { user } = ctx.state;

		if (!user) {
			return ctx.unauthorized('Bạn cần đăng nhập để xem thông tin nhà hàng.');
		}

		const { id } = ctx.params;

		const restaurant = await strapi.entityService.findOne('api::restaurant.restaurant', id, {
			populate: { manager: true },
		});

		if (!restaurant || restaurant.manager?.id !== user.id) {
			return ctx.forbidden('Bạn không có quyền truy cập nhà hàng này.');
		}

		const sanitizedEntity = await this.sanitizeOutput(restaurant, ctx);
		return this.transformResponse(sanitizedEntity);
	},

	async update(ctx) {
		const { user } = ctx.state;

		if (!user) {
			return ctx.unauthorized('Bạn cần đăng nhập để chỉnh sửa nhà hàng.');
		}

		const { id } = ctx.params;

		const restaurant = await strapi.entityService.findOne('api::restaurant.restaurant', id, {
			populate: { manager: true },
		});

		if (!restaurant) {
			return ctx.notFound('Không tìm thấy nhà hàng cần cập nhật.');
		}

		if (restaurant.manager?.id !== user.id) {
			return ctx.forbidden('Bạn không có quyền chỉnh sửa nhà hàng này.');
		}

		const submittedData = ctx.request?.body?.data ?? {};
		const normalizedData =
			typeof submittedData === 'object' && submittedData !== null ? submittedData : {};
		const allowedFields = ['name', 'address', 'phone'];

		const filteredData = Object.fromEntries(
			Object.entries(normalizedData).filter(([key]) => allowedFields.includes(key))
		);

		if (Object.keys(filteredData).length === 0) {
			return ctx.badRequest('Không có dữ liệu hợp lệ để cập nhật.');
		}

		const updatedEntity = await strapi.entityService.update('api::restaurant.restaurant', id, {
			data: filteredData,
		});

		const sanitizedEntity = await this.sanitizeOutput(updatedEntity, ctx);
		return this.transformResponse(sanitizedEntity);
	},
}));
