'use strict';

module.exports = async function getManagerRestaurantIds(strapi, userId) {
	if (!userId) {
		return [];
	}

	const numericUserId = Number(userId);
	const hasNumericId = Number.isFinite(numericUserId);

	const restaurants = await strapi.entityService.findMany('api::restaurant.restaurant', {
		fields: ['id'],
		populate: {
			managers: {
				fields: ['id'],
			},
		},
		pagination: { page: 1, pageSize: 200 },
	});

	if (!Array.isArray(restaurants) || restaurants.length === 0) {
		return [];
	}

	const targetNumericId = hasNumericId ? numericUserId : null;
	const targetStringId = String(userId);

	const normalizeManagerId = (manager) => {
		if (!manager) {
			return { numeric: null, string: null };
		}

		const resolve = (value) => {
			if (value === null || value === undefined) {
				return { numeric: null, string: null };
			}

			if (typeof value === 'number') {
				const numeric = Number(value);
				return {
					numeric: Number.isFinite(numeric) ? numeric : null,
					string: String(value),
				};
			}

			if (typeof value === 'string') {
				const trimmed = value.trim();
				const numeric = Number(trimmed);
				return {
					numeric: Number.isFinite(numeric) ? numeric : null,
					string: trimmed,
				};
			}

			if (Array.isArray(value)) {
				return resolve(value[0]);
			}

			if (typeof value === 'object') {
				if (value.id !== undefined) {
					return resolve(value.id);
				}

				if (value.data !== undefined) {
					return resolve(value.data);
				}

				if (value.attributes !== undefined) {
					return resolve(value.attributes);
				}
			}

			return { numeric: null, string: null };
		};

		return resolve(manager);
	};

	return restaurants
		.filter((restaurant) => {
			const managerRelation = restaurant?.managers;
			const { numeric, string } = normalizeManagerId(managerRelation);
			if (targetNumericId !== null && numeric !== null) {
				return numeric === targetNumericId;
			}
			return string !== null && string === targetStringId;
		})
		.map((restaurant) => {
			const rawId = typeof restaurant?.id === 'number' ? restaurant.id : restaurant?.attributes?.id;
			const resolvedId = Number(rawId);
			return Number.isFinite(resolvedId) ? resolvedId : null;
		})
		.filter((value) => typeof value === 'number');
};
