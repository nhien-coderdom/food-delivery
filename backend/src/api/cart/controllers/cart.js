"use strict";

module.exports = {
  async me(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();
    const carts = await strapi.db.query("api::cart.cart").findMany({
      where: { user: user.id },
      populate: { restaurant: true },
    });
    return ctx.send(carts);
  },
  
  async updateMe(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized("Bạn chưa đăng nhập.");

      const { items, restaurantId } = ctx.request.body;

      // Cập nhật / tạo giỏ hàng
      const cart = await strapi.db.query("api::cart.cart").upsert({
        where: { users_permissions_user: user.id, restaurant: restaurantId },
        update: { cart_item: items },
        create: {
          users_permissions_user: user.id,
          restaurant: restaurantId,
          cart_item: items,
        },
      });

      return ctx.send(cart);
    } catch (err) {
      console.error("Cart.updateMe error:", err);
      return ctx.internalServerError("Không thể cập nhật giỏ hàng.");
    }
  },

  async clear(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized("Bạn chưa đăng nhập.");

      await strapi.db.query("api::cart.cart").deleteMany({
        where: { users_permissions_user: user.id },
      });

      return ctx.send({ message: "Đã xóa giỏ hàng." });
    } catch (err) {
      console.error("Cart.clear error:", err);
      return ctx.internalServerError("Không thể xóa giỏ hàng.");
    }
  },

  async sync(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const { carts } = ctx.request.body;
    if (!carts || typeof carts !== "object") {
      return ctx.badRequest("Invalid carts data");
    }

    await strapi.db.query("api::cart.cart").deleteMany({
      where: { user: user.id },
    });

    for (const [restaurantId, items] of Object.entries(carts)) {
      await strapi.db.query("api::cart.cart").create({
        data: {
          user: user.id,
          restaurant: restaurantId,
          items,
        },
      });
    }

    return ctx.send({ ok: true });
  },

};
