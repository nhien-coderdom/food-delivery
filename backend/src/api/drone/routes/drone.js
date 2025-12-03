module.exports = {
  routes: [
    {
      method: "POST",
      path: "/drones/assign",
      handler: "drone.assign",
      config: { auth: false }
    },
    {
      method: "POST",
      path: "/drones/start",
      handler: "drone.start",
      config: { auth: false }
    },
    {
      method: "GET",
      path: "/drones",
      handler: "drone.list",
      config: { auth: false }
    }
  ]
};
