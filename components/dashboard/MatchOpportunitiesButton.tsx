
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MatchOpportunitiesButton({
  businessId,
}: {
  businessId: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleMatch() {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/businesses/${businessId}/opportunities/match`,
        { method: "POST" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to match opportunities"
        );
      }

      setMessage(
        `Matched ${data.processed} ${
          data.processed === 1
            ? "opportunity"
            : "opportunities"
        }.`
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleMatch}
        disabled={loading}
        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Matching..."
          : "Match opportunities"}
      </button>

      {message && (
        <p
          role="status"
          className="mt-2 text-sm text-emerald-400"
        >
          {message}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-2 text-sm text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}