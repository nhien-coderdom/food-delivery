"use strict";

const crypto = require("crypto");
const moment = require("moment");
const qs = require("qs");

module.exports = {
  async create(ctx) {
    try {
      const { amount, orderId } = ctx.request.body;

      const ipAddr = ctx.request.ip || ctx.request.header["x-forwarded-for"] || "127.0.0.1";
      const now = moment();
      const createDate = now.format("YYYYMMDDHHmmss");
      const expireDate = moment(now).add(15, "minutes").format("YYYYMMDDHHmmss");

      let vnp_Params = {
        vnp_Version: "2.1.0",
        vnp_Command: "pay",
        vnp_TmnCode: process.env.VNP_TMN_CODE,
        vnp_Amount: amount * 100,
        vnp_CurrCode: "VND",
        vnp_TxnRef: orderId || now.format("DDHHmmss"),
        vnp_OrderInfo: `Thanh toán đơn hàng ${orderId}`,
        vnp_OrderType: "billpayment",
        vnp_ReturnUrl: process.env.VNP_RETURN_URL,
        vnp_IpAddr: ipAddr,
        vnp_Locale: "vn",
        vnp_CreateDate: createDate,
        vnp_ExpireDate: expireDate,
      };

      vnp_Params = Object.fromEntries(Object.entries(vnp_Params).sort(([a], [b]) => a.localeCompare(b)));

      const signData = qs.stringify(vnp_Params, { encode: false });
      const hmac = crypto.createHmac("sha512", process.env.VNP_SECRET_KEY);
      const signature = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

      vnp_Params["vnp_SecureHashType"] = "SHA512";
      vnp_Params["vnp_SecureHash"] = signature;

      const query = qs.stringify(vnp_Params, { encode: true });
      const paymentUrl = `${process.env.VNP_PAYMENT_URL}?${query}`;

      return ctx.send({ paymentUrl });
    } catch (err) {
      console.error("Payment create error:", err);
      return ctx.badRequest("Không thể tạo link thanh toán");
    }
  },

  async return(ctx) {
    const query = ctx.request.query;
    const secureHash = query.vnp_SecureHash;

    delete query.vnp_SecureHash;
    delete query.vnp_SecureHashType;

    const signData = qs.stringify(query, { encode: false });
    const signed = crypto.createHmac("sha512", process.env.VNP_SECRET_KEY)
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    if (secureHash === signed) {
      // ✅ Xác minh thành công
      return ctx.send({
        message: "Thanh toán thành công",
        data: query,
      });
    } else {
      return ctx.badRequest("Chữ ký không hợp lệ");
    }
  },

  async ipn(ctx) {
    const query = ctx.request.query;
    const secureHash = query.vnp_SecureHash;

    delete query.vnp_SecureHash;
    delete query.vnp_SecureHashType;

    const signData = qs.stringify(query, { encode: false });
    const signed = crypto.createHmac("sha512", process.env.VNP_SECRET_KEY)
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    if (secureHash === signed) {
      // ✅ Thông báo từ VNPAY hợp lệ → cập nhật trạng thái đơn hàng
      const { vnp_TxnRef, vnp_ResponseCode } = query;

      if (vnp_ResponseCode === "00") {
        // update order to "paid" in DB
        // await strapi.db.query("api::order.order").update({ where: { code: vnp_TxnRef }, data: { status: "paid" } });
        console.log("Đơn hàng đã thanh toán:", vnp_TxnRef);
      }

      return ctx.send({ RspCode: "00", Message: "IPN OK" });
    } else {
      return ctx.send({ RspCode: "97", Message: "Invalid signature" });
    }
  },
};
