import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import { API_URL } from "./apiConfig";

export const client = new ApolloClient({
  link: new HttpLink({ uri: `${API_URL}/graphql` }),
  cache: new InMemoryCache(),
});

export default client;