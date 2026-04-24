"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "that PIN didn't work, my love");
      setLoading(false);
      return;
    }
    const { role } = await res.json();
    router.push(role === "snegu" ? "/snegu" : "/ribtu");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <input
        type="password"
        inputMode="numeric"
        autoFocus
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        placeholder="• • • •"
        className="w-full text-center text-3xl tracking-[0.5em] py-4 rounded-2xl bg-white border border-accent/30 focus:border-accent focus:outline-none shadow-soft"
      />
      {error && (
        <p className="text-center text-sm text-accent">{error}</p>
      )}
      <button type="submit" disabled={loading || !pin} className="btn-primary disabled:opacity-50">
        {loading ? "opening…" : "open"}
      </button>
    </form>
  );
}
