"use client";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function GenerateRoutineButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      await fetch("/api/routines/generate", { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading} className="gap-1.5">
      <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Generating..." : "New Routine"}
    </Button>
  );
}
