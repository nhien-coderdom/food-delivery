"use strict";

const crypto = require("crypto");
const moment = require("moment");
const qs = require("qs");

function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (let key of keys) {
    sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, "+");
  }
  return sorted;
}

module.exports = {
  async create(ctx) {
    try {
      const { amount, orderId } = ctx.request.body;

      // ⚠️ fix ipAddr để đảm bảo luôn IPv4
      let ipAddr =
        ctx.request.header["x-forwarded-for"] ||
        ctx.request.ip ||
        "127.0.0.1";
      if (ipAddr.includes("::1")) ipAddr = "127.0.0.1";

      const now = moment();
      const createDate = now.format("YYYYMMDDHHmmss");

      const tmnCode = process.env.VNP_TMN_CODE;
      const secretKey = process.env.VNP_SECRET_KEY;
      const vnpUrl = process.env.VNP_PAYMENT_URL;
      const returnUrl = process.env.VNP_RETURN_URL;

      let vnp_Params = {
        vnp_Version: "2.1.0",
        vnp_Command: "pay",
        vnp_TmnCode: tmnCode,
        vnp_Amount: amount * 100,
        vnp_CurrCode: "VND",
        vnp_TxnRef: orderId || now.format("DDHHmmss"),
        vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
        vnp_OrderType: "other",
        vnp_Locale: "vn",
        vnp_ReturnUrl: returnUrl,
        vnp_IpAddr: ipAddr,
        vnp_CreateDate: createDate,
      };

      // ✅ Sắp xếp + encode theo chuẩn VNPAY
      vnp_Params = sortObject(vnp_Params);

      const signData = qs.stringify(vnp_Params, { encode: false });
      const hmac = crypto.createHmac("sha512", secretKey);
      const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

      vnp_Params["vnp_SecureHash"] = signed;

      // ✅ encode=true để đúng format URL
      const query = qs.stringify(vnp_Params, { encode: false });
      const paymentUrl = `${vnpUrl}?${query}`;

      console.log("✅ VNPAY payment URL:", paymentUrl);

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

    const signData = qs.stringify(sortObject(query), { encode: false });
    const signed = crypto
      .createHmac("sha512", process.env.VNP_SECRET_KEY)
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    if (secureHash === signed) {
      return ctx.send({ message: "Thanh toán thành công", data: query });
    } else {
      return ctx.badRequest("Sai chữ ký");
    }
  },


  async ipn(ctx) {
    try {
      const query = { ...ctx.request.query };
      const secureHash = query.vnp_SecureHash;

      delete query.vnp_SecureHash;
      delete query.vnp_SecureHashType;

      const sorted = Object.fromEntries(
        Object.entries(query).sort(([a], [b]) =>
          a.localeCompare(b)
        )
      );

      const signData = qs.stringify(sorted, { encode: false });
      const signed = crypto
        .createHmac("sha512", process.env.VNP_SECRET_KEY)
        .update(Buffer.from(signData, "utf-8"))
        .digest("hex");

      if (secureHash === signed) {
        const { vnp_TxnRef, vnp_ResponseCode } = query;

        if (vnp_ResponseCode === "00") {
          console.log("✅ Đơn hàng đã thanh toán:", vnp_TxnRef);
          // await strapi.db.query("api::order.order")
          //   .update({ where: { code: vnp_TxnRef }, data: { status: "paid" } });
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
