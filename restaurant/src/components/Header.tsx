type HeaderProps = {
  userName: string;
};

export default function Header({ userName }: HeaderProps) {
  return (
    <div className="w-full bg-white border-b border-[#ffc58e] shadow-[0_2px_6px_rgba(255,138,31,0.08)]">
      <div className="max-w-6xl mx-auto text-center py-5">
        <h1 className="text-[#ff731d] font-extrabold text-2xl tracking-wide uppercase">
          HỆ THỐNG QUẢN LÝ NHÀ HÀNG
        </h1>
        <div className="text-sm text-gray-500 mt-1">
          Xin chào <span className="text-[#1aa179] font-semibold">{userName}</span>
        </div>
      </div>
    </div>
  );
}
