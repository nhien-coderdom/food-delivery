import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import React from "react";
import type { Page } from "../App";

type Props = {
  page: Page;
  setPage: React.Dispatch<React.SetStateAction<Page>>;
  content: React.ReactNode | null;
  onLogout: () => void;
  user: any;
};

const MainLayout = ({ page, setPage, content, onLogout, user }: Props) => {
  return (
    <div className="min-h-screen w-full bg-[#fff8f0]">
      <Header userName={user?.username ?? user?.email ?? "Admin"} />

      <div className="flex w-full h-[calc(100vh-92px)]">
        <Sidebar page={page} setPage={setPage} onLogout={onLogout} />

          <div className="flex-1 flex items-start justify-center px-10 py-10 overflow-y-auto">
            <div className="w-full max-w-5xl bg-[#fffaf2] rounded-[32px] min-h-[70vh] shadow-[0_12px_40px_rgba(255,138,31,0.12)] p-10">
            {content ? (
              content
            ) : (
              <div className="text-center text-sm text-gray-500 mt-16">
                <h2 className="text-[#ff731d] font-bold text-lg mb-3">Chọn chức năng bên trái</h2>
                <p>Hệ thống quản lý giúp bạn theo dõi, cập nhật và thống kê đơn hàng một cách nhanh chóng.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
