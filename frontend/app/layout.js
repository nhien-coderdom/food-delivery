import "./globals.css";
import ApolloWrapper from "./components/ApolloWrapper";
import Layout from "./components/Layout";

export const metadata = {
  title: "Food Delivery App",
  description: "Next.js + Strapi + Apollo Client",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ApolloWrapper>
          <Layout>{children}</Layout>
        </ApolloWrapper>
      </body>
    </html>
  );
}
