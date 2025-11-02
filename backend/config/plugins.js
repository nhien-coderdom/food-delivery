module.exports = ({ env }) => ({
  // Nếu không dùng GraphQL nữa thì xoá block này hoặc để vậy cũng không sao
  graphql: {
    enabled: false, // bạn nói không dùng nữa, mình tắt luôn
    config: {
      defaultLimit: 10,
      maxLimit: 20,
      apolloServer: {
        introspection: true,
      },
    },
  },

  upload: {
    config: {
      provider: "@strapi/provider-upload-cloudinary",
      providerOptions: {
        cloud_name: env("CLOUDINARY_NAME"),
        api_key: env("CLOUDINARY_KEY"),
        api_secret: env("CLOUDINARY_SECRET"),
      },
      actionOptions: {
        upload: {},
        delete: {},
      },
      sizeLimit: 250 * 1024 * 1024, // 250 mb
    },
  },
});