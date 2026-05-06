"use strict";

const { Server } = require("socket.io");

module.exports = {
  register() {},

  bootstrap({ strapi }) {
    const io = new Server(strapi.server.httpServer, {
      cors: {
        origin: ["http://localhost:8081", // client
      "http://172.20.10.3:8081", // client mạng LAN
      "http://localhost:5173", // manager
      "http://172.20.10.3:5173", // manager mạng LAN nếu cần
      "http://localhost:1337", // backend test
      ],
        methods: ["GET", "POST"],
        credentials: false,
      },
      transports: ["websocket", "polling"],
      path: "/socket.io/",
    });

    strapi.io = io;
    console.log("🚀 Socket.IO initialized");

    io.on("connection", (socket) => {
      console.log("🔗 Client connected:", socket.id);

      socket.on("disconnect", () => {
        console.log("🔴 Client disconnected:", socket.id);
      });

      // JOIN ORDER ROOM
      socket.on("drone:join", (orderId) => {
        const room = `order_${orderId}`;
        socket.join(room);
        console.log(`📌 ${socket.id} joined room ${room}`);

        socket.emit("drone:joined", { room });
      });

      // JOIN USER ROOM for order:update
      socket.on("identify", (userId) => {
        const room = `user_${userId}`;
        socket.join(room);
        console.log(`👤 ${socket.id} joined room ${room}`);
      });
    });
  },
};
