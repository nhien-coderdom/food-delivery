'use strict';

/**
 * Order API disabled placeholder.
 * Keeps the folder structure while the feature is rolled back.
 */

module.exports = {
  async checkout(ctx) {
    ctx.badRequest('Order API disabled');
  },
  async me(ctx) {
    ctx.badRequest('Order API disabled');
  },
  async getOne(ctx) {
    ctx.badRequest('Order API disabled');
  },
};
