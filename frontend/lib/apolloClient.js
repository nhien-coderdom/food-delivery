"use client";

import { ApolloClient, InMemoryCache } from "@apollo/client";

const client = new ApolloClient({
  uri: process.env.NEXT_PUBLIC_STRAPI_GRAPHQL_URL || "http://127.0.0.1:1337/graphql",
  cache: new InMemoryCache(),
});

export default client;
