"use client";

import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";

interface AllowlistEntry {
  id: string;
  email: string;
  addedBy: string | null;
  createdAt: string;
}

export default function AllowlistManager() {
  const [entries, setEntries] = useState<AllowlistEntry[]>([]);
  const [adminEmail, setAdminEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function load() {
    try {
      const res = await fetch(apiUrl("/api/admin/allowlist"));
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setEntries(data.entries);
      setAdminEmail(data.adminEmail);
    } catch {
      setError("Failed to load allowlist");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function addEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setAdding(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/admin/allowlist"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add");
        return;
      }
      setNewEmail("");
      load();
    } catch {
      setError("Network error");
    } finally {
      setAdding(false);
    }
  }

  async function removeEmail(email: string) {
    if (!confirm(`Remove ${email} from allowlist?`)) return;

    try {
      const res = await fetch(apiUrl(`/api/admin/allowlist?email=${encodeURIComponent(email)}`), {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to remove");
        return;
      }
      load();
    } catch {
      setError("Network error");
    }
  }

  if (loading) {
    return <div className="bg-card border border-card-border rounded-xl p-6 text-muted text-sm">Loading...</div>;
  }

  return (
    <div className="bg-card border border-card-border rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-medium text-muted">Allowed Email Addresses</h3>

      {error && (
        <div className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">{error}</div>
      )}

      <div className="divide-y divide-card-border">
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-sm">{entry.email}</p>
              {entry.email === adminEmail && (
                <span className="text-xs text-accent">Admin</span>
              )}
            </div>
            {entry.email !== adminEmail && (
              <button
                onClick={() => removeEmail(entry.email)}
                className="text-xs text-muted hover:text-danger transition-colors"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={addEmail} className="flex gap-2 pt-2">
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="email@gmail.com"
          className="flex-1 bg-transparent border border-card-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={adding || !newEmail.trim()}
          className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          {adding ? "Adding..." : "Add"}
        </button>
      </form>

      <p className="text-xs text-muted">
        Users on this list can sign in with Google. The admin email cannot be removed.
        Removing a user won&apos;t immediately log them out — their session will expire naturally.
      </p>
    </div>
  );
}
