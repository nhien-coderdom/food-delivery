'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/orders/manager',
      handler: 'api::order.order.managerFind',
    },
    {
      method: 'GET',
      path: '/orders/:id/manager',
      handler: 'api::order.order.managerFindOne',
    },
    {
      method: 'PUT',
      path: '/orders/:id/manager',
      handler: 'api::order.order.managerUpdate',
    },
  ],
};
