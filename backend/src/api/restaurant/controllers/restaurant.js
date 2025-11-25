"use strict";

/**
 * restaurant controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const getManagerRestaurantIds = require('../../../utils/get-manager-restaurant-ids');

module.exports = createCoreController('api::restaurant.restaurant', ({ strapi }) => ({
		async find(ctx) {
			const { user } = ctx.state;

			// If a logged-in manager requests, restrict results to their managed restaurants.
			let managedRestaurantIds = [];
			if (user) {
				managedRestaurantIds = await getManagerRestaurantIds(strapi, user.id);
				console.log('🔍 User ID:', user.id);
				console.log('🔍 Managed restaurant IDs:', managedRestaurantIds);
			}

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

		if (user && managedRestaurantIds.length > 0) {
			// Only apply id filter when a manager is signed in and has assigned restaurants.
			sanitizedQuery.filters.id = {
				...(sanitizedQuery.filters.id ?? {}),
				$in: managedRestaurantIds,
			};
		}

		const { results, pagination } = await strapi
			.service('api::restaurant.restaurant')
			.find(sanitizedQuery);

    const sanitizedResults = await this.sanitizeOutput(results, ctx);
    return this.transformResponse(sanitizedResults, { pagination });
  },

	async findOne(ctx) {
		// Allow public access to restaurant details so customers can view and order.
		const { id } = ctx.params;

		const restaurant = await strapi.entityService.findOne('api::restaurant.restaurant', id, {
			populate: { manager: true },
		});

		if (!restaurant) {
			return ctx.notFound('Không tìm thấy nhà hàng.');
		}

		const sanitizedEntity = await this.sanitizeOutput(restaurant, ctx);
		return this.transformResponse(sanitizedEntity);
	},

	// Ensure a manager can only be assigned to one restaurant.
	// This runs on create and update operations that include a `manager` relation in the payload.
	async create(ctx) {
		const submittedData = ctx.request?.body?.data ?? {};
		const extractManagerId = (data) => {
			if (!data) return null;
			// Possible shapes: manager: 1 | manager: { id: 1 } | manager: { connect: { id: 1 } } | manager: { data: { id: 1 } }
			if (typeof data === 'number') return data;
			if (typeof data === 'string' && data.trim() !== '') {
				const n = Number(data);
				return Number.isFinite(n) ? n : null;
			}
			if (typeof data === 'object') {
				if (data.id) return data.id;
				if (data.data && data.data.id) return data.data.id;
				if (data.connect && data.connect.id) return data.connect.id;
			}
			return null;
		};

		const managerId = extractManagerId(submittedData.manager ?? submittedData.managers ?? null);
		if (managerId) {
			const existing = await strapi.entityService.findMany('api::restaurant.restaurant', {
				filters: { manager: { id: { $eq: managerId } } },
				fields: ['id'],
				limit: 1,
			});

			if (Array.isArray(existing) && existing.length > 0) {
				return ctx.badRequest('Người dùng này đã được gán làm quản lý cho một nhà hàng khác.');
			}
		}

		// Proceed with default create
		const created = await super.create(ctx);
		return created;
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
		const allowedFields = ['name', 'address', 'phone', 'manager'];

		// Helper to extract manager id from payload shapes
		const extractManagerId = (data) => {
			if (!data) return null;
			if (typeof data === 'number') return data;
			if (typeof data === 'string' && data.trim() !== '') {
				const n = Number(data);
				return Number.isFinite(n) ? n : null;
			}
			if (typeof data === 'object') {
				if (data.id) return data.id;
				if (data.data && data.data.id) return data.data.id;
				if (data.connect && data.connect.id) return data.connect.id;
			}
			return null;
		};

		const managerId = extractManagerId(normalizedData.manager ?? normalizedData.managers ?? null);
		if (managerId) {
			// Check other restaurants assigned to this manager (excluding current)
			const others = await strapi.entityService.findMany('api::restaurant.restaurant', {
				filters: { id: { $ne: id }, manager: { id: { $eq: managerId } } },
				fields: ['id'],
				limit: 1,
			});
			if (Array.isArray(others) && others.length > 0) {
				return ctx.badRequest('Người dùng này đã được gán làm quản lý cho một nhà hàng khác.');
			}
		}

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
