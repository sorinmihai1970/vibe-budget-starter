"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        toast.error("Eroare la delogare");
        return;
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success("Ai fost delogat");
      router.push("/login");
    } catch (error) {
      console.error("[LOGOUT] Error:", error);
      toast.error("Eroare la delogare");
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-300 bg-white/70 hover:bg-white transition-all duration-200"
    >
      Ieșire
    </button>
  );
}
