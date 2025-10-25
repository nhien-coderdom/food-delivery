import { useEffect } from "react";
import { useUser } from "@clerk/clerk-expo";

const API_URL = process.env.EXPO_PUBLIC_STRAPI_URL || "http://127.0.0.1:1337";

export default function SyncClerkUser() {
  const { isSignedIn, user } = useUser();

  useEffect(() => {
    if (isSignedIn && user) {
      const syncUser = async () => {
        const data = {
          clerkUserID: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          username: user.username || user.firstName || "Anonymous",
          provider: user.externalAccounts?.[0]?.provider || "clerk",
          createdAt: user.createdAt,
        };

        try {
          const res = await fetch(`${API_URL}/api/sync-clerk`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });

          const result = await res.json();
          console.log("✅ Synced user to Strapi:", result);
        } catch (err) {
          console.error("❌ Sync failed:", err);
        }
      };

      syncUser();
    }
  }, [isSignedIn, user]);

  return null;
}
