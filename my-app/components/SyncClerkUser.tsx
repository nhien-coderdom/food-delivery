import { useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-expo";
import { API_URL } from "@/lib/apiConfig";

export default function SyncClerkUser() {
  const { isSignedIn, user } = useUser();
  const hasSynced = useRef(false);

  useEffect(() => {
    // Chỉ sync một lần khi user đã sign in và chưa từng sync
    if (isSignedIn && user && !hasSynced.current) {
      hasSynced.current = true; // Đánh dấu đã sync
      
      const syncUser = async () => {
        const data = {
          clerkUserID: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          username: user.username || user.firstName || "Anonymous",
          provider: user.externalAccounts?.[0]?.provider || "clerk",
          createdAt: user.createdAt,
        };

        try {
          console.log('📱 Syncing user to:', `${API_URL}/api/sync-clerk`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
          
          const res = await fetch(`${API_URL}/api/sync-clerk`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }

          const result = await res.json();
          console.log("✅ Synced user to Strapi:", result);
        } catch (err: any) {
          if (err.name === 'AbortError') {
            console.error("⏱️ Sync timeout - Strapi might not be running");
          } else {
            console.error("❌ Sync failed:", err.message);
          }
          console.error("💡 Make sure Strapi backend is running at:", API_URL);
          console.error("💡 Run: cd backend && npm run develop");
        }
      };

      // Delay để tránh race condition
      setTimeout(syncUser, 1000);
    }
    
    // Reset flag khi user sign out
    if (!isSignedIn) {
      hasSynced.current = false;
    }
  }, [isSignedIn, user?.id]); // Chỉ phụ thuộc vào user.id thay vì toàn bộ user object

  return null;
}
