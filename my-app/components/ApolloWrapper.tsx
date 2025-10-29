"use client";
import { ReactNode } from "react";
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react"; // ✅ v5 tách riêng phần React
import { API_URL } from "../lib/apiConfig";

const client = new ApolloClient({
  link: new HttpLink({ uri: `${API_URL}/graphql` }),
  cache: new InMemoryCache(),
});

export default function ApolloWrapper({ children }: { children: ReactNode }) {
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}