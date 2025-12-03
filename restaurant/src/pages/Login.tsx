import { type FormEvent, useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http:// 172.20.10.3:1337";

export default function LoginPage({
  onSuccess,
}: {
  onSuccess: (user: any, jwt: string) => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setError(null);
  }, [identifier, password]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!identifier.trim() || !password.trim()) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`${API_URL}/api/auth/local`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();
      console.log("✅ Login response data:", data);

      if (!response.ok || !data?.jwt) {
        throw new Error(data?.error?.message ?? "Đăng nhập thất bại, vui lòng thử lại");
      }

      localStorage.setItem("restaurant_admin_token", data.jwt);
      localStorage.setItem("restaurant_admin_user", JSON.stringify(data.user));

      onSuccess(data.user, data.jwt);
    } catch (err: any) {
      setError(err?.message ?? "Đăng nhập thất bại, vui lòng thử lại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d] px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-[#1c1c1e] rounded-2xl border border-[#2a2a2c] px-8 py-10 space-y-4"
      >
        <h1 className="text-2xl font-extrabold text-white text-center">Đăng nhập quản trị</h1>

        <input
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="Email hoặc tên đăng nhập"
          className="w-full bg-[#2c2c2e] text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
          autoFocus
        />

        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          placeholder="Mật khẩu"
          className="w-full bg-[#2c2c2e] text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60"
        >
          {submitting ? "Đang xử lý..." : "Đăng nhập"}
        </button>

        <p className="text-center text-sm text-gray-400">Liên hệ admin hệ thống nếu quên mật khẩu.</p>
      </form>
    </div>
  );
}
