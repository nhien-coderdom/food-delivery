'use strict';

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/orders/manager",
      handler: "api::order.order.managerFind",
    },
    {
      method: "GET",
      path: "/orders/manager/:id",
      handler: "api::order.order.managerFindOne",
    },
    {
      method: "PUT",
      path: "/orders/manager/:id",
      handler: "api::order.order.managerUpdate",
    },
    {
  method: "POST",
  path: "/orders/customer-confirm/:id",
  handler: "order.customerConfirm",
  config: { auth: false }
}

  ],
};
