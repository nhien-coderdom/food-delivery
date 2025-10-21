"use client";

import { gql} from "@apollo/client";
import { useQuery } from "@apollo/client/react"; 
import { useParams } from "next/navigation";
import Image from "next/image";
import Loader from "../../components/Loader";            // dùng alias gọn
import { formatVND } from "@/utils/formatCurrency";  // alias gọn

// LẤY THÊM documentId CHO RESTAURANT
const GET_RESTAURANTS = gql`
  query {
    restaurants {
      documentId
      name
      dishes {
        documentId
        image { url }
        name
        price
        description
      }
    }
  }
`;

function DishCard({ dish }) {
  const base = process.env.NEXT_PUBLIC_STRAPI_URL || "http://127.0.0.1:1337";
  const imageUrl = `${base}${dish.image.url}`;

  return (
    <div className="w-full md:w-1/2 lg:w-1/3 p-4">
      <div className="h-full bg-gray-100 rounded-2xl shadow hover:shadow-lg transition">
        <Image
          src={imageUrl}
          alt={dish.name}
          width={400}
          height={300}
          className="rounded-t-2xl object-cover w-full"
        />
        <div className="p-6">
          <h3 className="font-heading text-xl font-bold text-gray-900 mb-1">{dish.name}</h3>
          <p className="text-green-600 font-semibold mb-2">
            {formatVND(dish.price)}
          </p>
          {dish.description && (
            <p className="text-sm text-gray-500 mb-4">{dish.description}</p>
          )}
          <button
            onClick={() => alert(`Added ${dish.name} to cart`)}
            className="block w-full px-6 py-3 text-white font-bold bg-gray-900 hover:bg-gray-800 focus:ring-4 focus:ring-gray-600 rounded-full"
          >
            + Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RestaurantPage() {
  const { id } = useParams();             // id = documentId trên URL
  const { loading, error, data } = useQuery(GET_RESTAURANTS);

  if (loading) return <Loader />;
  if (error)   return <p className="text-red-500">Error loading data.</p>;

  const restaurant = data?.restaurants?.find(r => r.documentId === id);
  if (!restaurant) {
    return <h1 className="text-center text-gray-600 text-2xl mt-10">Restaurant not found</h1>;
  }

  const dishes = restaurant.dishes ?? [];

  return (
    <div className="py-8">
      <h1 className="text-4xl font-bold text-center text-green-600 mb-8">
        {restaurant.name}
      </h1>

      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-wrap -m-4">
          {dishes.length > 0 ? (
            dishes.map((dish) => <DishCard key={dish.documentId} dish={dish} />)
          ) : (
            <p className="text-center text-gray-500 w-full">No dishes found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
