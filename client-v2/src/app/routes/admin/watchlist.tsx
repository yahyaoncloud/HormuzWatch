import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageTodoList, type TodoItem } from "@/components/ui/PageTodoList";

const WATCHLIST_TODOS: TodoItem[] = [
  { id: "w1", title: "Surveillance Watchlist Roster & Add Wizard", category: "UI & UX", completed: true, notes: "Roster view with modal wizard for adding IMO/ICAO entities" },
  { id: "w2", title: "Backend GET & POST /watchlist Endpoints", category: "API & Data", completed: false, notes: "Connect Go REST API endpoints for persistent watchlist database storage" },
  { id: "w3", title: "Automated Anomaly Score Watchlist Rule", category: "ML & Anomaly", completed: false, notes: "Auto-add targets to watchlist when anomaly score exceeds set threshold" },
  { id: "w4", title: "Zone Entry Webhook & Push Alerts", category: "Security & Auth", completed: false, notes: "Trigger real-time alert when watchlisted asset enters monitored sector" },
];

interface WatchlistItem {
  id: string;
  name: string;
  type: "Vessel" | "Aircraft";
  reason: string;
  addedBy: string;
  addedAt: string;
  riskLevel: "Critical" | "High" | "Medium";
}

export default function AdminWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ id: "", name: "", type: "Vessel" as "Vessel" | "Aircraft", reason: "", riskLevel: "High" as "Critical" | "High" | "Medium" });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.id || !newItem.name) return;
    const item: WatchlistItem = {
      ...newItem,
      addedBy: "ykinwork1@gmail.com",
      addedAt: new Date().toISOString().split("T")[0],
    };
    setWatchlist(prev => [item, ...prev]);
    setShowAddModal(false);
    setNewItem({ id: "", name: "", type: "Vessel", reason: "", riskLevel: "High" });
  };

  const handleRemove = (id: string) => {
    setWatchlist(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-fg)]">Surveillance Watchlist</h1>
          <p className="font-ui text-sm text-[var(--color-fg-muted)] mt-1">
            Managed directory of flagged maritime vessels and aviation targets subject to continuous automated monitoring.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-3 py-2 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white text-xs font-ui font-semibold rounded-lg flex items-center gap-1.5 self-start sm:self-auto transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Asset to Watchlist
        </button>
      </div>

      {/* Watchlist Table */}
      <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-left">
              <th className="px-4 py-3 font-ui text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider">Asset ID / Name</th>
              <th className="px-4 py-3 font-ui text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 font-ui text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider">Risk Level</th>
              <th className="px-4 py-3 font-ui text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider">Surveillance Rationale</th>
              <th className="px-4 py-3 font-ui text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider">Added By / Date</th>
              <th className="px-4 py-3 font-ui text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {watchlist.map((item) => (
              <tr key={item.id} className="border-b border-[var(--color-border)]/60 hover:bg-[var(--color-bg-elevated)] transition-colors">
                <td className="px-4 py-3">
                  <div className="font-semibold text-sm text-[var(--color-fg)]">{item.name}</div>
                  <div className="font-mono text-xs text-[var(--color-fg-muted)]">{item.id}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-bg-elevated)] text-[var(--color-fg)] border border-[var(--color-border)]">
                    {item.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      item.riskLevel === "Critical"
                        ? "bg-red-500/20 text-red-500 border-red-500/30"
                        : item.riskLevel === "High"
                        ? "bg-amber-500/20 text-amber-500 border-amber-500/30"
                        : "bg-blue-500/20 text-blue-500 border-blue-500/30"
                    }`}
                  >
                    {item.riskLevel}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-[var(--color-fg-muted)] max-w-sm">{item.reason}</td>
                <td className="px-4 py-3 text-xs text-[var(--color-fg-muted)]">
                  <div className="font-mono text-[11px]">{item.addedBy}</div>
                  <div className="text-[10px]">{item.addedAt}</div>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="p-1.5 rounded hover:bg-red-500/10 text-red-500 transition-colors"
                    title="Remove from Watchlist"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TODO List Component */}
      <PageTodoList pageTitle="Surveillance Watchlist" items={WATCHLIST_TODOS} />

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-display text-lg font-bold text-[var(--color-fg)]">Add Asset to Watchlist</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--color-fg-muted)] mb-1">Asset ID (IMO / ICAO / Tail)</label>
                <input
                  type="text"
                  required
                  value={newItem.id}
                  onChange={e => setNewItem(prev => ({ ...prev, id: e.target.value }))}
                  placeholder="e.g. IMO 9283741"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-mono text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary-600)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-fg-muted)] mb-1">Asset Name</label>
                <input
                  type="text"
                  required
                  value={newItem.name}
                  onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. AL-MUTANABBI"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-ui text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary-600)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--color-fg-muted)] mb-1">Type</label>
                  <select
                    value={newItem.type}
                    onChange={e => setNewItem(prev => ({ ...prev, type: e.target.value as "Vessel" | "Aircraft" }))}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-ui text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary-600)]"
                  >
                    <option value="Vessel">Vessel</option>
                    <option value="Aircraft">Aircraft</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-fg-muted)] mb-1">Risk Level</label>
                  <select
                    value={newItem.riskLevel}
                    onChange={e => setNewItem(prev => ({ ...prev, riskLevel: e.target.value as any }))}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-ui text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary-600)]"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[var(--color-fg-muted)] mb-1">Surveillance Rationale</label>
                <textarea
                  rows={3}
                  required
                  value={newItem.reason}
                  onChange={e => setNewItem(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Reason for flagging this asset..."
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-ui text-[var(--color-fg)] focus:outline-none focus:border-[var(--color-primary-600)]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs font-ui border border-[var(--color-border)] text-[var(--color-fg)] rounded-lg hover:bg-[var(--color-bg)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-ui bg-[var(--color-primary-600)] text-white font-semibold rounded-lg hover:bg-[var(--color-primary-700)]"
                >
                  Add to Watchlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
