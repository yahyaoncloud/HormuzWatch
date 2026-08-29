import { CheckSquare, Square, ListTodo } from "lucide-react";
import { useState } from "react";

export interface TodoItem {
  id: string;
  title: string;
  category: "API & Data" | "UI & UX" | "ML & Anomaly" | "Security & Auth";
  completed: boolean;
  notes?: string;
}

interface PageTodoListProps {
  pageTitle: string;
  items: TodoItem[];
}

export function PageTodoList({ pageTitle, items: initialItems }: PageTodoListProps) {
  const [items, setItems] = useState<TodoItem[]>(initialItems);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const completedCount = items.filter((i) => i.completed).length;
  const progressPct = Math.round((completedCount / items.length) * 100) || 0;

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 space-y-4 ">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[var(--color-primary-600)]/15 text-[var(--color-primary-600)] border border-[var(--color-primary-600)]/30">
            <ListTodo className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-[var(--color-fg)]">
              {pageTitle} — Feature Implementation Checklist
            </h3>
            <p className="font-ui text-xs text-[var(--color-fg-muted)]">
              Interactive JSX roadmap of completed components and pending additions.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="font-mono text-xs font-bold text-[var(--color-fg)]">
              {completedCount} / {items.length} Done
            </span>
            <span className="block font-mono text-[10px] text-[var(--color-primary-600)]">{progressPct}% Complete</span>
          </div>
          <div className="w-20 bg-[var(--color-bg)] h-2 rounded-full overflow-hidden border border-[var(--color-border)]">
            <div
              className="bg-[var(--color-primary-600)] h-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((todo) => (
          <div
            key={todo.id}
            onClick={() => toggleItem(todo.id)}
            className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
              todo.completed
                ? "bg-[var(--color-success)]/10 border-[var(--color-success)]/30 opacity-75"
                : "bg-[var(--color-bg)] border-[var(--color-border)] hover:border-[var(--color-primary-600)]/50"
            }`}
          >
            <div className="mt-0.5 shrink-0 text-[var(--color-primary-600)]">
              {todo.completed ? (
                <CheckSquare className="h-4 w-4 text-[var(--color-success)]" />
              ) : (
                <Square className="h-4 w-4 text-[var(--color-fg-muted)]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`font-ui text-xs font-semibold ${
                    todo.completed ? "line-through text-[var(--color-fg-muted)]" : "text-[var(--color-fg)]"
                  }`}
                >
                  {todo.title}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)] border border-[var(--color-border)] shrink-0">
                  {todo.category}
                </span>
              </div>
              {todo.notes && (
                <p className="text-[11px] font-ui text-[var(--color-fg-muted)] mt-1">{todo.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
