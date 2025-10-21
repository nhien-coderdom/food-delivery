"use client";

import { gql } from "@apollo/client/core"; // ✅ lấy gql từ core
import { useQuery } from "@apollo/client/react"; // ✅ lấy useQuery từ react
import Link from "next/link";
import Image from "next/image";
import Loader from "./Loader";

const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://127.0.0.1:1337";

// ✅ Query đúng với schema Strapi hiện tại
const QUERY = gql`
  query {
    restaurants {
      documentId
      name
      description
      image {
        url
      }
    }
  }
`;

// ✅ Component hiển thị 1 nhà hàng
function RestaurantCard({ restaurant }) {
  const imageUrl = restaurant.image?.url
    ? `${API_URL}${restaurant.image.url}`
    : "/no-image.jpg";

  return (
    <div className="w-full md:w-1/2 lg:w-1/3 p-4">
      <div className="h-full bg-gray-100 rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200">
        {/* Hình ảnh */}
        <Image
          className="w-full h-60 object-cover rounded-t-2xl"
          height={300}
          width={400}
          src={imageUrl}
          alt={restaurant.name}
        />

        {/* Nội dung */}
        <div className="p-8 flex flex-col justify-between">
          <div>
            <h3 className="mb-3 text-xl font-bold text-gray-900">
              {restaurant.name}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {restaurant.description || "No description available"}
            </p>
          </div>

          {/* 🔗 Nút View */}
          <div className="flex flex-wrap md:justify-center -m-2">
            <div className="w-full md:w-auto p-2 my-2">
              <Link
                className="block w-full px-12 py-3.5 text-lg text-center text-white font-bold bg-gray-900 hover:bg-gray-800 focus:ring-4 focus:ring-gray-600 rounded-full"
                href={`/restaurant/${restaurant.documentId}`}
              >
                View
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ✅ Component chính
export default function RestaurantList({ query = "" }) {
  const { loading, error, data } = useQuery(QUERY);

  if (loading) return <Loader />;
  if (error)
    return <p className="text-red-500">Error loading restaurants</p>;

  // ✅ Không có .data/.attributes nữa
  const restaurants = data?.restaurants || [];

  // ✅ Lọc theo query
  const filtered = restaurants.filter((r) =>
    r.name?.toLowerCase().includes(query.toLowerCase())
  );

  if (filtered.length === 0) return <h1>No Restaurants Found</h1>;

  return (
    <div className="py-16 px-8 bg-white rounded-3xl">
      <div className="max-w-7xl mx-auto flex flex-wrap -m-4 mb-6">
        {filtered.map((res) => (
          <RestaurantCard key={res.documentId} restaurant={res} />
        ))}
      </div>
    </div>
  );
}