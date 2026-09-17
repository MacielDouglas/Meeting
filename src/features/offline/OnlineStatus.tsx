"use client";

import { useEffect, useState } from "react";
import { FaWifi } from "react-icons/fa6";
import { es } from "@/shared/i18n/es";

export function OnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    () => typeof window === "undefined" || window.navigator.onLine,
  );

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <p
      role="status"
      className="flex items-center gap-2 rounded-xl border border-input bg-secondary px-3 py-2 text-sm"
    >
      <FaWifi aria-hidden /> {es.offlineMessage}
    </p>
  );
}
