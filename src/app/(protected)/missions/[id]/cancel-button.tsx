"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelButton({ missionId }: { missionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleCancel() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/missions/${missionId}/cancel`, { method: "POST" });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all disabled:opacity-50"
      style={{
        border: "1px solid rgba(239,68,68,0.4)",
        color: confirming ? "#fff" : "rgb(248,113,113)",
        background: confirming ? "rgba(239,68,68,0.3)" : "transparent",
      }}
    >
      {loading ? "Cancelling…" : confirming ? "Confirm cancel?" : "Cancel Mission"}
    </button>
  );
}
