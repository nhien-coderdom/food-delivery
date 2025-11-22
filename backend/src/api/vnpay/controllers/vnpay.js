"use strict";

const crypto = require("crypto");
const qs = require("qs");
const moment = require("moment");

function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (let key of keys) {
    sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, "+");
  }
  return sorted;
}

module.exports = {
  // ============================================
  // B1: CREATE PAYMENT
  // ============================================
  async create(ctx) {
    try {
      const body = ctx.request.body;
      const orderID = String(body.orderId); // LUÔN DÙNG orderID

      // Lưu đơn tạm
      await strapi.entityService.create("api::payment-temp.payment-temp", {
        data: {
          orderID,
          payload: body,
          publishedAt: new Date(),
        },
      });

      // Generate VNPAY URL
      let ipAddr = ctx.request.ip.includes("::1") ? "127.0.0.1" : ctx.request.ip;
      const now = moment();
      const createDate = now.format("YYYYMMDDHHmmss");
      const expireDate = now.add(15, "minutes").format("YYYYMMDDHHmmss");

      let params = {
        vnp_Version: "2.1.0",
        vnp_Command: "pay",
        vnp_TmnCode: process.env.VNP_TMN_CODE,
        vnp_Amount: body.amount * 100,
        vnp_CurrCode: "VND",
        vnp_TxnRef: orderID, // SỬA ĐÚNG
        vnp_OrderInfo: `PAY|${orderID}`, // SỬA ĐÚNG
        vnp_OrderType: "bill",
        vnp_Locale: "vn",
        vnp_ReturnUrl: process.env.VNP_RETURN_URL,
        vnp_IpAddr: ipAddr,
        vnp_CreateDate: createDate,
        vnp_ExpireDate: expireDate,
      };

      params = sortObject(params);

      const signData = qs.stringify(params, { encode: false });
      const hmac = crypto.createHmac("sha512", process.env.VNP_SECRET_KEY);
      params["vnp_SecureHash"] = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

      const paymentUrl =
        process.env.VNP_PAYMENT_URL + "?" + qs.stringify(params, { encode: false });

      return ctx.send({ paymentUrl });
    } catch (err) {
      console.error("❌ CREATE ERROR:", err);
      return ctx.badRequest("Lỗi tạo link thanh toán");
    }
  },

  // ============================================
  // B2: RETURN (TẠO ORDER THẬT)
  // ============================================
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

      const orderID = query.vnp_TxnRef; // SỬA TÊN CHUẨN

      // Lấy temp
      const temp = await strapi.db
        .query("api::payment-temp.payment-temp")
        .findOne({ where: { orderID } });

      if (!temp) {
        return ctx.redirect("http://localhost:8081/checkout/fail?reason=no-temp");
      }

      const data = temp.payload;
      const callback = data.callbackUrl;

      // Detect Web vs App
      const ua = ctx.request.header["user-agent"] || "";
      const isWeb =
        ua.includes("Mozilla") || ua.includes("Chrome") || ua.includes("Safari");

      // ❌ Sai chữ ký
      if (signed !== secureHash) {
        if (isWeb) {
          return ctx.redirect("http://localhost:8081/checkout/fail?reason=signature");
        }
        return ctx.redirect(callback + "?failed=1&reason=signature");
      }

      // ✔ Thành công
      if (query.vnp_ResponseCode === "00") {
        const order = await strapi.entityService.create("api::order.order", {
          data: {
            orderID: data.orderId,
            totalPrice: data.amount,
            paymentStatus: "paid",
            statusOrder: "confirmed",
            phoneNumber: data.customerPhone,
            deliveryAddress: data.deliveryAddress,
            note: data.note || "",
            restaurant: data.restaurantId,
            users_permissions_user: data.userId,
            drone_location: data.coords,
            route: data.route,
            customerLocation: data.coords,
            transactionID: query.vnp_TransactionNo,
            publishedAt: new Date(),
          },
        });

        // Order items
        for (const item of data.items) {
          await strapi.entityService.create("api::order-item.order-item", {
            data: {
              price: item.price,
              quantity: item.quantity,
              dish: item.dishId,
              order: order.id,
              publishedAt: new Date(),
            },
          });
        }

        // Xoá temp theo orderID (đã sửa)
        await strapi.db
          .query("api::payment-temp.payment-temp")
          .delete({ where: { orderID } });

        // Drone simulator
        const simulator = strapi.service("api::drone-simulator.drone-simulator");
        if (simulator) simulator.simulate(strapi, order);

        // Redirect theo Web / App
        if (isWeb) {
          return ctx.redirect(
            `http://localhost:8081/checkout/success?orderId=${orderID}`
          );
        }

        return ctx.redirect(callback + `?orderId=${orderID}`);
      }

      // ❌ Không thành công
      if (isWeb) {
        return ctx.redirect(`http://localhost:8081/checkout/fail?orderId=${orderID}`);
      }
      return ctx.redirect(callback + `?orderId=${orderID}&failed=1`);
    } catch (err) {
      console.error("❌ RETURN ERROR:", err);
      return ctx.redirect("http://localhost:8081/checkout/fail?reason=server");
    }
  },

  // ============================================
  // B3: IPN
  // ============================================
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

      if (secureHash === signed) {
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
      }

      return ctx.send({ RspCode: "97", Message: "Invalid signature" });
    } catch (err) {
      console.error("IPN error:", err);
      return ctx.send({ RspCode: "99", Message: "System Error" });
    }
  },
};
