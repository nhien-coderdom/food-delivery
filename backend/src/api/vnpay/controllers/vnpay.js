"use strict";

const crypto = require("crypto");
const moment = require("moment");
const qs = require("qs");

function sortObject(obj) {
  const sorted = {};
  Object.keys(obj)
    .sort()
    .forEach((key) => {
      sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, "+");
    });
  return sorted;
}

module.exports = {
  // ======================================================
  // B1: CREATE ORDER + ORDER ITEMS + PAYMENT URL
  // ======================================================
  async create(ctx) {
    try {
      const {
        amount,
        orderId,
        restaurantId,
        userId,
        customerPhone,
        deliveryAddress,
        note,
        items,
        coords,
        route,
        callbackUrl,
      } = ctx.request.body;

      if (!amount || !orderId || !restaurantId || !userId) {
        return ctx.badRequest("Thiếu thông tin đơn hàng");
      }

      // ============================
      // 0️⃣ LẤY DEPOT DRONE TỪ ENV
      // ============================
      const depot_lat = parseFloat(process.env.DEPOT_LAT || "0");
      const depot_lng = parseFloat(process.env.DEPOT_LNG || "0");

      const drone_location = {
        lat: depot_lat,
        lng: depot_lng,
      };

      // ============================
      // 1️⃣ CHECK EXIST ORDER
      // ============================
      const existed = await strapi.db
        .query("api::order.order")
        .findOne({ where: { orderID: String(orderId) } });

      if (existed) {
        return ctx.send({ paymentUrl: existed.paymentUrl });
      }

      // ============================
      // 2️⃣ TẠO ORDER
      // ============================
      const order = await strapi.entityService.create("api::order.order", {
        data: {
          orderID: String(orderId),
          totalPrice: amount,
          paymentStatus: "unpaid",
          statusOrder: "pending",

          phoneNumber: customerPhone,
          deliveryAddress,
          note: note || "",
          restaurant: restaurantId,
          users_permissions_user: userId,

          customerLocation: coords || null,
          route: route || [],
          callbackUrl: callbackUrl || null,

          // 🚀 LƯU DRONE TỪ ENV
          drone_location,

          publishedAt: new Date(),
        },
      });

      // ============================
      // 3️⃣ TẠO ORDER ITEMS
      // ============================
      if (Array.isArray(items)) {
        for (const item of items) {
          // ❗ BỎ QUA ITEM RÁC
          if (!item.dishId || !item.price || !item.quantity) {
            continue;
          }

          await strapi.entityService.create("api::order-item.order-item", {
            data: {
              order: order.id,        // không cần connect
              dish: item.dishId,      // không cần connect
              price: item.price,
              quantity: item.quantity,
              notes: item.notes || "",
              publishedAt: new Date(),
},
          });
        }
      }

      // ============================
      // 4️⃣ TẠO LINK VNPAY
      // ============================
      let ipAddr = ctx.request.ip.includes("::1")
        ? "127.0.0.1"
        : ctx.request.ip;

      const now = moment();
      const createDate = now.format("YYYYMMDDHHmmss");
      const expireDate = now.add(15, "minutes").format("YYYYMMDDHHmmss");

      let vnp_Params = {
        vnp_Version: "2.1.0",
        vnp_Command: "pay",
        vnp_TmnCode: process.env.VNP_TMN_CODE,
        vnp_Amount: amount * 100,
        vnp_CurrCode: "VND",
        vnp_TxnRef: String(orderId),
        vnp_OrderInfo: `Thanh toán đơn hàng #${orderId}`,
        vnp_OrderType: "bill",
        vnp_Locale: "vn",
        vnp_ReturnUrl: process.env.VNP_RETURN_URL,
        vnp_IpAddr: ipAddr,
        vnp_CreateDate: createDate,
        vnp_ExpireDate: expireDate,
      };

      vnp_Params = sortObject(vnp_Params);

      const signData = qs.stringify(vnp_Params, { encode: false });
      vnp_Params["vnp_SecureHash"] = crypto
        .createHmac("sha512", process.env.VNP_SECRET_KEY)
        .update(Buffer.from(signData, "utf-8"))
        .digest("hex");

      const paymentUrl =
        process.env.VNP_PAYMENT_URL +
        "?" +
        qs.stringify(vnp_Params, { encode: false });

      return ctx.send({ paymentUrl });
    } catch (err) {
      console.error("❌ Payment CREATE error:", err);
      return ctx.badRequest("Không thể tạo link thanh toán");
    }
  },

  // ======================================================
  // B2: RETURN URL
  // ======================================================
  async return(ctx) {
    try {
      const query = ctx.request.query;
      const secureHash = query.vnp_SecureHash;

      delete query.vnp_SecureHash;
      delete query.vnp_SecureHashType;

      const sorted = sortObject(query);
      const signData = qs.stringify(sorted, { encode: false });

      const signed = crypto
        .createHmac("sha512", process.env.VNP_SECRET_KEY)
        .update(Buffer.from(signData, "utf-8"))
        .digest("hex");

      if (secureHash !== signed) {
        return ctx.redirect(`${process.env.FRONTEND_WEB_URL}/checkout/fail?reason=signature`);
      }

      // ============================
      // FIND ORDER
      // ============================
      const order = await strapi.db.query("api::order.order").findOne({
        where: { orderID: String(query.vnp_TxnRef) },
      });

      if (!order) {
        return ctx.redirect(`${process.env.FRONTEND_WEB_URL}/checkout/fail?reason=order-not-found`);
      }

      const orderId = order.orderID;
      const callback = order.callbackUrl;

      const ua = ctx.request.header["user-agent"]?.toLowerCase() || "";
      const isWeb = ua.includes("mozilla") || ua.includes("chrome") || ua.includes("safari");

      const FRONTEND_WEB = process.env.FRONTEND_WEB_URL;
      const FRONTEND_APP = callback || process.env.FRONTEND_APP_URL;
// ============================
      // PAYMENT SUCCESS
      // ============================
      if (query.vnp_ResponseCode === "00") {
        await strapi.db.query("api::order.order").update({
          where: { orderID: orderId },
          data: {
            paymentStatus: "paid",
            statusOrder: "pending",
            transactionID: query.vnp_TransactionNo,
          },
        });

        if (isWeb)
          return ctx.redirect(`${FRONTEND_WEB}/checkout/success?orderId=${orderId}`);
        else
          return ctx.redirect(`${FRONTEND_APP}/checkout/success?orderId=${orderId}`);
      }

      // FAIL
      if (isWeb)
        return ctx.redirect(`${FRONTEND_WEB}/checkout/fail?orderId=${orderId}`);
      else
        return ctx.redirect(`${FRONTEND_APP}/checkout/fail?orderId=${orderId}`);

    } catch (err) {
      console.error("❌ RETURN error:", err);
      return ctx.redirect(`${process.env.FRONTEND_WEB_URL}/checkout/fail?reason=server`);
    }
  },

  // ======================================================
  // B3: IPN
  // ======================================================
  async ipn(ctx) {
    try {
      const query = { ...ctx.request.query };
      const secureHash = query.vnp_SecureHash;

      delete query.vnp_SecureHash;
      delete query.vnp_SecureHashType;

      const sorted = sortObject(query);
      const signData = qs.stringify(sorted, { encode: false });

      const signed = crypto
        .createHmac("sha512", process.env.VNP_SECRET_KEY)
        .update(Buffer.from(signData, "utf-8"))
        .digest("hex");

      if (secureHash !== signed) {
        return ctx.send({ RspCode: "97", Message: "Invalid signature" });
      }

      if (query.vnp_ResponseCode === "00") {
        await strapi.db.query("api::order.order").update({
          where: { orderID: query.vnp_TxnRef },
          data: {
            paymentStatus: "paid",
            statusOrder: "confirmed",
          },
        });
      }

      return ctx.send({ RspCode: "00", Message: "Success" });
    } catch (err) {
      console.error("❌ IPN error:", err);
      return ctx.send({ RspCode: "99", Message: "System error" });
    }
  },
};
