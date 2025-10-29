module.exports = {
  graphql: {
    enabled: true,
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
      providerOptions: {
        localServer: {
          maxage: 300000
        },
      },
      sizeLimit: 250 * 1024 * 1024, // 250mb
    },
  },
};
