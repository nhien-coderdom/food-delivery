// /src/api/sync-clerk/controllers/sync-clerk.js

module.exports = {
  async create(ctx) {
    try {
      const { email, clerkUserID, username, provider } = ctx.request.body;

      if (!email || !clerkUserID) {
        return ctx.badRequest("Missing required fields (email, clerkUserID)");
      }

      // 1️⃣ Check if user exists
      let user = await strapi.db.query("plugin::users-permissions.user").findOne({
        where: { email },
      });

      // 2️⃣ Get Authenticated role
      const authenticatedRole = await strapi.db
        .query("plugin::users-permissions.role")
        .findOne({ where: { type: "authenticated" } });

      // 3️⃣ Create user if not exists
      if (!user) {
        user = await strapi.db
          .query("plugin::users-permissions.user")
          .create({
            data: {
              username: username || email.split("@")[0],
              email,
              provider,
              clerkUserID,
              confirmed: true,
              password: Math.random().toString(36).slice(2),
              role: authenticatedRole.id,
            },
          });
      }

      // 4️⃣ Create JWT
      const jwt = strapi.plugins["users-permissions"].services.jwt.issue({
        id: user.id,
      });

      // 5️⃣ Return to frontend
      return ctx.send({
        message: "User synced successfully",
        user,
        jwt,
      });

    } catch (error) {
      console.error("❌ Sync Clerk User Error:", error);
      return ctx.internalServerError("Internal Server Error");
    }
  },
};
