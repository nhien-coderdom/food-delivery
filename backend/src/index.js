// /src/index.js
"use strict";

const { Server } = require("socket.io");

module.exports = {
  register() {},

  bootstrap({ strapi }) {
    const io = new Server(strapi.server.httpServer, {
      cors: {
        origin: ["http://localhost:8081", "http://10.10.30.181:8081", "*"],
        methods: ["GET", "POST"],
        credentials: false,
      },
      transports: ["websocket", "polling"],
      path: "/socket.io/",
    });

    strapi.io = io;

    io.on("connection", (socket) => {
      console.log("🔗 Client connected:", socket.id);

      socket.on("disconnect", () => {
        console.log("🔴 Client disconnected:", socket.id);
      });

      socket.on("drone:join", (orderId) => {
        socket.join("order_" + orderId);
        console.log("📌 Client joined order room:", orderId);
      });
    });

    console.log("🚀 Socket.IO initialized");
  },
};
