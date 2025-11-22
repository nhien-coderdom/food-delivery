'use strict';

/**
 * dish controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const getManagerRestaurantIds = require('../../../utils/get-manager-restaurant-ids');

module.exports = createCoreController('api::dish.dish', ({ strapi }) => ({
	async find(ctx) {
		const { user } = ctx.state;

		if (!user) {
			return ctx.unauthorized('Bạn cần đăng nhập để xem món ăn.');
		}

		const managedRestaurantIds = await getManagerRestaurantIds(strapi, user.id);

		if (managedRestaurantIds.length === 0) {
			return this.transformResponse([], { pagination: { page: 1, pageSize: 10, pageCount: 0, total: 0 } });
		}

		const sanitizedQuery = await this.sanitizeQuery(ctx);

		const ensureObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
		const normalizeIdFilter = (value) => {
			if (value && typeof value === 'object' && !Array.isArray(value)) {
				return { ...value };
			}

			if (typeof value === 'number') {
				return { $eq: value };
			}

			if (typeof value === 'string') {
				const numeric = Number(value);
				return Number.isFinite(numeric) ? { $eq: numeric } : { $eq: value };
			}

			return {};
		};

		const baseFilters = ensureObject(sanitizedQuery.filters);
		const restaurantFilter = ensureObject(baseFilters.restaurant);
		const restaurantIdFilter = normalizeIdFilter(restaurantFilter.id);
		const dishIdFilter = normalizeIdFilter(baseFilters.id);

		sanitizedQuery.filters = {
			...baseFilters,
			restaurant: {
				...restaurantFilter,
				id: {
					...restaurantIdFilter,
					$in: managedRestaurantIds,
				},
			},
			id: {
				...dishIdFilter,
			},
		};

		const { results, pagination } = await strapi.service('api::dish.dish').find(sanitizedQuery);
		const sanitizedResults = await this.sanitizeOutput(results, ctx);

		return this.transformResponse(sanitizedResults, { pagination });
	},

	async findOne(ctx) {
		const { user } = ctx.state;

		if (!user) {
			return ctx.unauthorized('Bạn cần đăng nhập để xem món ăn.');
		}

		const managedRestaurantIds = await getManagerRestaurantIds(strapi, user.id);
		const { id } = ctx.params;

		const dish = await strapi.entityService.findOne('api::dish.dish', id, {
			populate: { restaurant: true, category: true },
		});

		if (!dish) {
			return ctx.notFound('Không tìm thấy món ăn đã yêu cầu.');
		}

		const restaurantId = dish?.restaurant?.id;
		if (!managedRestaurantIds.includes(restaurantId)) {
			return ctx.forbidden('Bạn không có quyền truy cập món ăn này.');
		}

		const sanitizedEntity = await this.sanitizeOutput(dish, ctx);
		return this.transformResponse(sanitizedEntity);
	},

	async create(ctx) {
		const { user } = ctx.state;

		if (!user) {
			return ctx.unauthorized('Bạn cần đăng nhập để tạo món ăn.');
		}

		const managedRestaurantIds = await getManagerRestaurantIds(strapi, user.id);
		if (managedRestaurantIds.length === 0) {
			return ctx.forbidden('Tài khoản này chưa được gán vào nhà hàng nào.');
		}

		const incomingData = ctx.request?.body?.data ?? {};
		const targetRestaurantId = incomingData?.restaurant ?? managedRestaurantIds[0];

		if (!managedRestaurantIds.includes(targetRestaurantId)) {
			return ctx.forbidden('Bạn không thể tạo món cho nhà hàng khác.');
		}

		ctx.request.body = {
			...ctx.request.body,
			data: {
				...incomingData,
				restaurant: targetRestaurantId,
			},
		};

		return super.create(ctx);
	},

	async update(ctx) {
		const { user } = ctx.state;

		if (!user) {
			return ctx.unauthorized('Bạn cần đăng nhập để cập nhật món ăn.');
		}

		const managedRestaurantIds = await getManagerRestaurantIds(strapi, user.id);
		if (managedRestaurantIds.length === 0) {
			return ctx.forbidden('Tài khoản này chưa được gán vào nhà hàng nào.');
		}

		const { id } = ctx.params;
		const existing = await strapi.entityService.findOne('api::dish.dish', id, {
			populate: { restaurant: true },
		});

		if (!existing) {
			return ctx.notFound('Không tìm thấy món ăn cần cập nhật.');
		}

		const restaurantId = existing?.restaurant?.id;
		if (!managedRestaurantIds.includes(restaurantId)) {
			return ctx.forbidden('Bạn không thể chỉnh sửa món ăn này.');
		}

		const incomingData = ctx.request?.body?.data ?? {};
		const targetRestaurantId = incomingData?.restaurant ?? restaurantId;

		if (!managedRestaurantIds.includes(targetRestaurantId)) {
			return ctx.forbidden('Bạn không thể chuyển món sang nhà hàng khác.');
		}

		ctx.request.body = {
			...ctx.request.body,
			data: {
				...incomingData,
				restaurant: targetRestaurantId,
			},
		};

		return super.update(ctx);
	},

	async delete(ctx) {
		const { user } = ctx.state;

		if (!user) {
			return ctx.unauthorized('Bạn cần đăng nhập để xoá món ăn.');
		}

		const managedRestaurantIds = await getManagerRestaurantIds(strapi, user.id);
		if (managedRestaurantIds.length === 0) {
			return ctx.forbidden('Tài khoản này chưa được gán vào nhà hàng nào.');
		}

		const { id } = ctx.params;
		const existing = await strapi.entityService.findOne('api::dish.dish', id, {
			populate: { restaurant: true },
		});

		if (!existing) {
			return ctx.notFound('Không tìm thấy món ăn cần xoá.');
		}

		const restaurantId = existing?.restaurant?.id;
		if (!managedRestaurantIds.includes(restaurantId)) {
			return ctx.forbidden('Bạn không thể xoá món ăn này.');
		}

		return super.delete(ctx);
	},
}));
