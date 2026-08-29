import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
import { getUsers } from "@/lib/api";
import type { SiteUser } from "@/lib/api";

export default function AdminUsers() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => getUsers(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-[var(--color-primary-600)] border-t-transparent rounded-full" />
        <span className="ml-3 text-sm text-[var(--color-fg-muted)]">Loading users...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 font-semibold">Failed to load users</p>
        <p className="text-xs text-[var(--color-fg-muted)] mt-1">{error instanceof Error ? error.message : "Unknown error"}</p>
      </div>
    );
  }

  const users: SiteUser[] = data ?? [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--color-fg)]">User Management</h1>
        <p className="font-ui text-sm text-[var(--color-fg-muted)] mt-1">{users.length} registered users</p>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
              <th className="px-4 py-3 text-left font-ui text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider">Username</th>
              <th className="px-4 py-3 text-left font-ui text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider">Email</th>
              <th className="px-4 py-3 text-left font-ui text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider">Role</th>
              <th className="px-4 py-3 text-left font-ui text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left font-ui text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider">Joined</th>
              <th className="px-4 py-3 text-left font-ui text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: SiteUser) => (
              <tr key={u.id} className="border-b border-[var(--color-border)]/60 hover:bg-[var(--color-bg-elevated)] transition-colors">
                <td className="px-4 py-3 font-semibold text-sm text-[var(--color-fg)]">{u.username}</td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--color-fg-muted)]">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-primary-600)]/15 text-[var(--color-primary-600)]">
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    u.status === 'active' ? 'bg-[var(--color-success)]/20 text-[var(--color-success)]' : 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]'
                  }`}>
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-[var(--color-fg-muted)]">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button type="button" className="p-1 rounded hover:bg-[var(--color-success)]/10 text-[var(--color-success)]" title="Approve">
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <button type="button" className="p-1 rounded hover:bg-[var(--color-danger)]/10 text-[var(--color-danger)]" title="Remove">
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-12 text-[var(--color-fg-muted)]">No users registered yet.</div>
        )}
      </div>
    </div>
  );
}
