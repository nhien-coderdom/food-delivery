"use strict";

const crypto = require("crypto");
const moment = require("moment");
const qs = require("qs");

// Hàm sắp xếp & encode đúng chuẩn VNPAY
function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (let key of keys) {
    sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, "+");
  }
  return sorted;
}

module.exports = {
  // 🧾 B1: Tạo link thanh toán + lưu đơn "unpaid"
  async create(ctx) {
    try {
      const { amount, orderId, restaurantId, userId, items } = ctx.request.body;
      console.log("📦 Payload nhận từ client:", ctx.request.body);

      // Kiểm tra dữ liệu bắt buộc
      if (!amount || !restaurantId || !userId) {
        return ctx.badRequest("Thiếu thông tin đơn hàng");
      }

      // 🔍 Kiểm tra order đã tồn tại chưa (dựa vào orderID)
      const existingOrder = await strapi.db.query("api::order.order").findOne({
        where: { order_id: orderId },
      });

      if (existingOrder) {
        console.log(`⚠️ Order ${orderId} đã tồn tại, bỏ qua tạo mới`);
        return ctx.send({ paymentUrl: existingOrder.paymentUrl });
      }

      // 🧩 Tạo từng order_item (vì item chưa có ID thật)
      let createdItems = [];
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          const newItem = await strapi.db
            .query("api::order-item.order-item")
            .create({
              data: {
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                restaurant: restaurantId,
                image: item.image || null,
              },
            });
          createdItems.push(newItem.id);
        }
      }

      // 🧾 Lưu đơn hàng tạm (pending / unpaid)
      const newOrder = await strapi.db.query("api::order.order").create({
        data: {
          order_id: String(orderId), // 🔑 dùng đúng field UID của bạn
          totalPrice: amount,
          statusOrder: "pending",
          paymentStatus: "unpaid",
          restaurant: restaurantId,
          users_permissions_user: userId,
          order_item: createdItems,
        },
      });
      console.log("✅ Order created in DB:", newOrder);
      // 🧩 Tạo link thanh toán hợp lệ VNPAY
      let ipAddr =
        ctx.request.header["x-forwarded-for"] ||
        ctx.request.ip ||
        "127.0.0.1";
      if (ipAddr.includes("::1")) ipAddr = "127.0.0.1";

      const now = moment();
      const createDate = now.format("YYYYMMDDHHmmss");
      const expireDate = now.add(15, "minutes").format("YYYYMMDDHHmmss");

      const tmnCode = process.env.VNP_TMN_CODE;
      const secretKey = process.env.VNP_SECRET_KEY;
      const vnpUrl = process.env.VNP_PAYMENT_URL;
      const returnUrl = process.env.VNP_RETURN_URL;

      const orderInfo = `Thanh toan don hang ${orderId} thoi gian: ${moment().format(
        "YYYY-MM-DD HH:mm:ss"
      )}`;

      let vnp_Params = {
        vnp_Version: "2.1.0",
        vnp_Command: "pay",
        vnp_TmnCode: tmnCode,
        vnp_Amount: amount * 100,
        vnp_CurrCode: "VND",
        vnp_TxnRef: orderId,
        vnp_OrderInfo: orderInfo,
        vnp_OrderType: "other",
        vnp_Locale: "vn",
        vnp_ReturnUrl: returnUrl,
        vnp_IpAddr: ipAddr,
        vnp_CreateDate: createDate,
        vnp_ExpireDate: expireDate,
      };

      vnp_Params = sortObject(vnp_Params);
      const signData = qs.stringify(vnp_Params, { encode: false });
      const hmac = crypto.createHmac("sha512", secretKey);
      const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
      vnp_Params["vnp_SecureHash"] = signed;

      const query = qs.stringify(vnp_Params, { encode: false });
      const paymentUrl = `${vnpUrl}?${query}`;

      console.log("✅ VNPAY payment URL:", paymentUrl);
      return ctx.send({ paymentUrl });
    } catch (err) {
      console.error("❌ Payment create error:", err);
      return ctx.badRequest("Không thể tạo link thanh toán");
    }
  },

  // 🟢 B2: Callback khi thanh toán xong
  async return(ctx) {
    const query = ctx.request.query;
    const secureHash = query.vnp_SecureHash;
    delete query.vnp_SecureHash;
    delete query.vnp_SecureHashType;

    const signData = qs.stringify(sortObject(query), { encode: false });
    const signed = crypto
      .createHmac("sha512", process.env.VNP_SECRET_KEY)
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    if (secureHash !== signed) {
      return ctx.badRequest("Sai chữ ký");
    }

    const vnp_TxnRef = query.vnp_TxnRef;
    const vnp_ResponseCode = query.vnp_ResponseCode;
    const transactionCode = query.vnp_TransactionNo;

    try {
      if (vnp_ResponseCode === "00") {
        await strapi.db.query("api::order.order").update({
          where: { order_id: vnp_TxnRef },
          data: {
            paymentStatus: "paid",
            statusOrder: "pending",
            transactionCode,
            updatedAt: new Date(),
          },
        });

        console.log(`✅ Đơn ${vnp_TxnRef} thanh toán thành công.`);
        return ctx.redirect("http://localhost:8081/checkout/success");
      } else {
        console.log(`❌ Đơn ${vnp_TxnRef} thất bại.`);
        return ctx.redirect("http://localhost:8081/checkout/fail");
      }
    } catch (err) {
      console.error("❌ Error in return callback:", err);
      return ctx.redirect("http://localhost:8081/checkout/fail");
    }
  },

  // 📨 B3: IPN xác nhận từ server VNPAY
  async ipn(ctx) {
    try {
      const query = { ...ctx.request.query };
      const secureHash = query.vnp_SecureHash;
      delete query.vnp_SecureHash;
      delete query.vnp_SecureHashType;

      const sorted = Object.fromEntries(
        Object.entries(query).sort(([a], [b]) => a.localeCompare(b))
      );

      const signData = qs.stringify(sorted, { encode: false });
      const signed = crypto
        .createHmac("sha512", process.env.VNP_SECRET_KEY)
        .update(Buffer.from(signData, "utf-8"))
        .digest("hex");

      if (secureHash === signed) {
        const { vnp_TxnRef, vnp_ResponseCode } = query;

        if (vnp_ResponseCode === "00") {
          console.log("✅ IPN xác nhận thanh toán:", vnp_TxnRef);
          await strapi.db.query("api::order.order").update({
            where: { order_id: vnp_TxnRef },
            data: { paymentStatus: "paid", statusOrder: "pending" },
          });
        }

        return ctx.send({ RspCode: "00", Message: "IPN OK" });
      } else {
        console.warn("⚠️ Sai chữ ký IPN");
        return ctx.send({ RspCode: "97", Message: "Invalid signature" });
      }
    } catch (err) {
      console.error("IPN error:", err);
      return ctx.send({ RspCode: "99", Message: "Unknown error" });
    }
  },
};
