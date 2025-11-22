"use strict";

module.exports = {
  routes: [
    {
      method: "POST",
      path: "/drone/simulate",
      handler: "drone-simulator.simulate",
      config: {
        auth: false,   // Bật auth nếu bạn muốn bảo vệ endpoint
      },
    },
  ],
};
