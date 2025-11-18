'use strict';

/**
 * order router
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/orders/manager',
      handler: 'order.managerFind',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/orders/manager/:id',
      handler: 'order.managerFindOne',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
