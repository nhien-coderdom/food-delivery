"use strict";

const { createCoreController } = require("@strapi/strapi").factories;
const getManagerRestaurantIds = require("../../../utils/get-manager-restaurant-ids");

module.exports = createCoreController("api::dish.dish", ({ strapi }) => ({

  // =======================
  // ⭐ FIND MANY DISHES
  // =======================
  async find(ctx) {
    const { user } = ctx.state;

    if (!user) {
      return ctx.unauthorized("Bạn cần đăng nhập để xem món ăn.");
    }

    // ⭐ Lấy query ban đầu
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    const userRole = user.role?.type || "authenticated";

    // ⭐ Nếu là Manager → CHỈ xem món thuộc restaurant họ quản lý
    if (userRole === "manager") {
      const managedRestaurantIds = await getManagerRestaurantIds(strapi, user.id);

      if (managedRestaurantIds.length === 0) {
        return this.transformResponse([], {
          pagination: { page: 1, pageSize: 10, pageCount: 0, total: 0 },
        });
      }

      // 🔥 Bắt buộc filter theo restaurant.id ∈ managedRestaurantIds
      sanitizedQuery.filters = {
        ...sanitizedQuery.filters,
        restaurant: {
          id: { $in: managedRestaurantIds },
        },
      };
    }

    // ⭐ User thường → được xem tất cả → không cần áp thêm filter

    // ⭐ Populate đầy đủ
    sanitizedQuery.populate = sanitizedQuery.populate || {
      image: true,
      category: true,
      restaurant: true,
    };

    const { results, pagination } = await strapi
      .service("api::dish.dish")
      .find(sanitizedQuery);

    return this.transformResponse(
      await this.sanitizeOutput(results, ctx),
      { pagination }
    );
  },

  // =======================
  // ⭐ FIND ONE DISH
  // =======================
  async findOne(ctx) {
    const { user } = ctx.state;

    if (!user) {
      return ctx.unauthorized("Bạn cần đăng nhập để xem món ăn.");
    }

    const userRole = user.role?.type || "authenticated";
    const { id } = ctx.params;

    const dish = await strapi.entityService.findOne("api::dish.dish", id, {
      populate: { image: true, category: true, restaurant: true },
    });

    if (!dish) return ctx.notFound("Không tìm thấy món ăn.");

    // ⭐ Manager → Chỉ xem món trong nhà hàng họ quản lý
    if (userRole === "manager") {
      const managedRestaurants = await getManagerRestaurantIds(strapi, user.id);
      if (!managedRestaurants.includes(dish.restaurant.id)) {
        return ctx.forbidden("Bạn không có quyền xem món ăn này.");
      }
    }

    return this.transformResponse(
      await this.sanitizeOutput(dish, ctx)
    );
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
