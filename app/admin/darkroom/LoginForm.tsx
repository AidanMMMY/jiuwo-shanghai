"use client";

import { useState } from "react";

export default function LoginForm() {
  const [token, setToken] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    const url = new URL(window.location.href);
    url.searchParams.set("token", token.trim());
    window.location.href = url.toString();
  };

  return (
    <main className="bg-[#0a0a0a] min-h-[100lvh] px-4 md:px-12 py-12">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl text-[#f5f5f0] mb-2">Darkroom Admin</h1>
        <p className="text-sm text-[#a0a0a0] mb-8">
          Enter your admin token to view memory insights.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Admin token"
            className="w-full bg-transparent border border-[#c9a22733] px-4 py-3 text-[#f5f5f0] placeholder:text-[#666] focus:border-[#c9a227] focus:outline-none"
          />
          <button
            type="submit"
            className="w-full bg-[#c9a227] text-[#0a0a0a] px-4 py-3 font-medium hover:bg-[#b08d1e] transition-colors"
          >
            Open Dashboard
          </button>
        </form>
      </div>
    </main>
  );
}
