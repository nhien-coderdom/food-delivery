'use strict';
// const { Server } = require('socket.io');
// const droneSim = require('../drone-sim');

module.exports = {
  register() {},
  async bootstrap({ strapi }) {
    const httpServer = strapi.server.httpServer;
    // const io = new Server(httpServer, {
    //   cors: { origin: '*' },
    //   path: '/socket.io/',
    // });

    // strapi.io = io;
    // droneSim.init(io);

    // console.log('✅ Socket.IO đã khởi tạo. Chờ client yêu cầu "drone:start".');
  },
};