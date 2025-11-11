import { useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-expo";
import { useAuth } from "@/app/context/AuthContext"; // 👈 dùng context đã có

export default function SyncClerkUser() {
  const { isSignedIn, user: clerkUser } = useUser();
  const { user, syncUserToStrapi } = useAuth(); // 👈 thêm
  const hasSynced = useRef(false);

  useEffect(() => {
    // Chỉ sync khi đã đăng nhập, có clerkUser, và AuthContext chưa có user.id
    if (isSignedIn && clerkUser && !user?.id && !hasSynced.current) {
      hasSynced.current = true; // Đánh dấu đã sync
      console.log("📱 Clerk user loaded, syncing with Strapi...");

      const doSync = async () => {
        try {
          await syncUserToStrapi(clerkUser); // 👈 dùng hàm có sẵn trong AuthContext
          console.log("✅ Clerk user synced & stored in AuthContext.");
        } catch (err: any) {
          console.error("❌ SyncClerkUser failed:", err.message);
        }
      };

      // Delay nhẹ để đảm bảo Clerk load xong
      setTimeout(doSync, 800);
    }

    // Reset flag nếu user sign out
    if (!isSignedIn) {
      hasSynced.current = false;
    }
  }, [isSignedIn, clerkUser?.id]);

  return null;
}
