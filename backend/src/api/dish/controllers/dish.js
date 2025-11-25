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

		// DEBUG: log permissions/context to diagnose 404 on update
		try {
			console.debug('[DEBUG] dish.update - user.id:', user?.id);
			console.debug('[DEBUG] dish.update - id param:', id);
			console.debug('[DEBUG] dish.update - managedRestaurantIds:', JSON.stringify(managedRestaurantIds));
			console.debug('[DEBUG] dish.update - existing lookup result:', JSON.stringify(existing));
		} catch (e) {
			console.debug('[DEBUG] dish.update - debug stringify failed', e && e.message);
		}

		if (!existing) {
			return ctx.notFound('Không tìm thấy món ăn cần cập nhật.');
		}

		const restaurantId = existing?.restaurant?.id;
		if (!managedRestaurantIds.includes(restaurantId)) {
			return ctx.forbidden('Bạn không thể chỉnh sửa món ăn này.');
		}

		const incomingData = ctx.request?.body?.data ?? {};

		// DEBUG: log incoming request body and computed data for troubleshooting
		try {
			console.debug('[DEBUG] dish.update - ctx.request.body:', JSON.stringify(ctx.request?.body));
			console.debug('[DEBUG] dish.update - incomingData:', JSON.stringify(incomingData));
		} catch (e) {
			console.debug('[DEBUG] dish.update - could not stringify request body', e && e.message);
		}
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

		try {
			return await super.update(ctx);
		} catch (err) {
			// Log full error to help trace 404/NotFoundError origins
			try {
				console.error('[ERROR] dish.update - super.update failed', err && err.stack ? err.stack : err);
			} catch (e) {
				console.error('[ERROR] dish.update - failed to stringify error', e && e.message);
			}

			// Fallback: if core update threw NotFound (possibly due to internal ownership/filters),
			// we've already validated ownership above; attempt a direct entityService.update as a safe workaround.
			const isNotFound = err && (err.status === 404 || err.statusCode === 404 || err.name === 'NotFoundError');
			if (isNotFound) {
				try {
					console.warn('[WARN] dish.update - fallback to entityService.update for id:', id);
					const updateOptions = { data: ctx.request.body.data };
					// Preserve populate query if present so response shape remains consistent
					if (ctx.query && ctx.query.populate) {
						updateOptions.populate = ctx.query.populate;
					}

					const updated = await strapi.entityService.update('api::dish.dish', id, updateOptions);
					const sanitized = await this.sanitizeOutput(updated, ctx);
					return this.transformResponse(sanitized);
				} catch (e2) {
					try {
						console.error('[ERROR] dish.update - fallback entityService.update failed', e2 && e2.stack ? e2.stack : e2);
					} catch (e3) {
						console.error('[ERROR] dish.update - failed to stringify fallback error', e3 && e3.message);
					}
					// If fallback fails, rethrow original error to preserve original semantics
					throw err;
				}
			}

			throw err;
		}
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
