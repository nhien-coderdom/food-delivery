module.exports = {
  routes: [
    {
      method: "PUT",
      path: "/cart/sync",
      handler: "cart.sync",
      config: {
        auth: false },
    },
    {
      method: "GET",
      path: "/cart/me",
      handler: "cart.me",
      config: {
        auth: false },
    },
    {
      method: "DELETE",
      path: "/cart/clear",
      handler: "cart.clear",
      config: {
        auth: false },
    },
  ],
};
