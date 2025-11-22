'use strict';
const { Server } = require('socket.io');

module.exports = {
  register() {},

  async bootstrap({ strapi }) {
    const io = new Server(strapi.server.httpServer, {
      cors: { origin: "*" },
      path: "/socket.io/",
    });

    strapi.io = io;

    io.on("connection", (socket) => {
      console.log("🔗 Client:", socket.id);
    });

    console.log("🚀 Socket.IO ready");
  },
};