import React from "react";
import type { Page } from "../App";

type Props = {
  page: Page;
  setPage: React.Dispatch<React.SetStateAction<Page>>;
  onLogout: () => void;
};

export default function Sidebar({ page, setPage, onLogout }: Props) {
  const btnBase = "w-full text-white font-semibold rounded-2xl py-3 shadow-[0_6px_0_rgba(208,91,17,0.6)] transition duration-200";
  const idleBtn = "bg-gradient-to-b from-[#ff963a] to-[#ff6f0f] hover:brightness-105";
  const activeBtn = "bg-[#ff7b1a] shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)]";

  const renderButton = (label: string, key: string) => (
    <button
      key={key}
      onClick={() => setPage(key)}
      className={`${btnBase} ${page === key ? activeBtn : idleBtn}`}
    >
      {label}
    </button>
  );

  return (
    <div className="w-[280px] bg-[#fff1e2] px-6 py-5 flex flex-col h-full border-r border-[#f7c68c] shadow-[inset_-4px_0_12px_rgba(255,223,199,0.6)]">
      <div className="flex flex-col gap-4 mt-2">
        {renderButton("Thông tin nhà hàng", "info")}
        {renderButton("Quản lý menu", "menu")}
        {renderButton("Quản lý đơn hàng", "orders")}
        {renderButton("Doanh thu", "revenue")}
      </div>

      <div className="mt-auto pt-6">
        <button
          onClick={onLogout}
          className="w-full bg-white text-[#ff6f75] py-3 rounded-xl border border-[#ffc7cd] font-semibold shadow-sm hover:bg-[#ffe7ea] transition duration-200"
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
