import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

const API_URL = process.env.EXPO_PUBLIC_STRAPI_URL || "http://127.0.0.1:1337";

export const client = new ApolloClient({
  link: new HttpLink({ uri: `${API_URL}/graphql` }),
  cache: new InMemoryCache(),
});

export default client;