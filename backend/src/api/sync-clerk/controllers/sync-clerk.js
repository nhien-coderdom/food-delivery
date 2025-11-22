// /src/api/sync-clerk/controllers/sync-clerk.js
module.exports = {
  async create(ctx) {
    try {
      const { email, clerkUserID, username, provider } = ctx.request.body;

      if (!email || !clerkUserID) {
        ctx.throw(400, "Missing required fields (email, clerkUserID)");
      }

      // 1. Check if user exists
      const existing = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { email },
      });

      if (existing) {
        return { message: "User already exists", user: existing };
      }

      // 2. Get authenticated role
      const authenticatedRole = await strapi.db
        .query("plugin::users-permissions.role")
        .findOne({ where: { type: "authenticated" } });

      // 3. Create user with role
      const newUser = await strapi.db.query('plugin::users-permissions.user').create({
        data: {
          username: username || email.split('@')[0],
          email,
          provider,
          password: Math.random().toString(36).slice(2),
          clerkUserID,
          role: authenticatedRole.id,   // 👈 FIX HERE
        },
      });

      return { message: "✅ User created", user: newUser };
    } catch (error) {
      console.error("❌ Sync Clerk User Error:", error);
      ctx.throw(500, "Internal Server Error");
    }
  },
};
