"use client";

import { useState } from "react";
import RestaurantList from "./components/RestaurantList";

export default function HomePage() {
  const [query, setQuery] = useState("");

  return (
    <main className="mx-auto container my-10 px-6">
      {/* 🔍 Ô tìm kiếm */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="Search restaurants..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="appearance-none block w-full p-3 leading-5 text-gray-900 border border-gray-200 rounded-lg shadow-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
        />
      </div>

      {/* 📋 Danh sách nhà hàng */}
      <RestaurantList query={query} />
    </main>
  );
}
