import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, ClipboardList, Inbox } from 'lucide-react';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface TaskLite {
  id: string | number;
  title: string;
  description: string;
  deadline: string;
  status: TaskStatus;
}

const daysUntil = (deadline: string) => {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(deadline);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
};

const shortDate = (deadline: string) => {
  const d = new Date(deadline);
  const datePart = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  if (!deadline.includes('T')) return datePart;
  return `${datePart} ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
};

const tone = (d: number) => {
  if (d <= 0) return 'text-rose-600';
  if (d <= 2) return 'text-amber-600';
  return 'text-slate-400';
};

const URGENT_THRESHOLD = 3;

export default function NotificationBell({
  tasks,
  onOpenTask,
  onGoBoard,
}: {
  tasks: TaskLite[];
  onOpenTask: (t: TaskLite) => void;
  onGoBoard: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const urgent = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== 'completed' && !!t.deadline)
        .map((t) => ({ task: t, d: daysUntil(t.deadline)! }))
        .filter((x) => x.d <= URGENT_THRESHOLD)
        .sort((a, b) => a.d - b.d),
    [tasks]
  );

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const count = urgent.length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notifikasi deadline"
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg border bg-white transition ${
          open ? 'border-slate-300 text-slate-900' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
        }`}
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute -right-32 top-11 z-40 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl sm:right-0 sm:-right-auto">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Deadline Mendesak
            </span>
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
              {count}
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {count === 0 ? (
              <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center">
                <Inbox className="h-4 w-4 text-slate-400" />
                <p className="text-xs text-slate-500">Tidak ada deadline mendesak</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {urgent.map(({ task, d }) => (
                  <li key={task.id}>
                    <button
                      onClick={() => {
                        setOpen(false);
                        onOpenTask(task);
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-slate-50"
                    >
                      <span className="truncate text-sm font-medium text-slate-800">{task.title}</span>
                      <span className={`shrink-0 text-[11px] font-medium ${tone(d)}`}>{shortDate(task.deadline)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            onClick={() => {
              setOpen(false);
              onGoBoard();
            }}
            className="flex w-full items-center justify-center gap-1.5 border-t border-slate-100 bg-slate-50 py-2 text-[11px] font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Buka Board <ClipboardList className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
