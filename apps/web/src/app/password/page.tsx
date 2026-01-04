"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PasswordPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    // Redirect with password param - middleware will validate
    window.location.href = `/?password=${encodeURIComponent(password)}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-sm mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">GLIMPSE</h1>
          <p className="text-sm text-[var(--muted)]">
            JWST Transit Spectroscopy Visualizer
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-3 rounded-lg bg-[var(--paper)] border border-[var(--border)]
                         focus:outline-none focus:border-[var(--accent)]
                         placeholder:text-[var(--muted-light)]"
              autoFocus
              autoComplete="off"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">
              Incorrect password
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 rounded-lg bg-[var(--accent)] text-white font-medium
                       hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Enter"}
          </button>
        </form>

        <p className="text-xs text-[var(--muted-light)] text-center mt-8">
          This site is password protected
        </p>
      </div>
    </div>
  );
}
