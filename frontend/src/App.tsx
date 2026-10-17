import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Sparkles,
  Trash2,
  Plus,
  HelpCircle,
  Search,
  CheckCircle2,
  Circle,
  Calendar,
  X,
  Loader2,
  Send,
  Trophy,
  ListTodo,
  LayoutDashboard,
  Target,
  CheckCheck,
  AlertCircle,
  RefreshCw,
  Paperclip,
  UploadCloud,
  FileText,
  ExternalLink,
  PlayCircle,
  Columns3,
  GripVertical,
  Pencil,
  StickyNote,
  LogOut,
} from 'lucide-react';
import NotesView from './components/NotesView';
import NotificationBell from './components/NotificationBell';
import RichText from './components/RichText';
import ConfirmDialog from './components/ConfirmDialog';

const API = 'http://localhost:3000/api';


type TaskStatus = 'pending' | 'in_progress' | 'completed';

interface PostTestQuestion {
  question: string;
  options: string[];
  answer: string;
}

interface AIData {
  explanation: string;
  answer: string;
  post_test: PostTestQuestion[];
}

interface Task {
  id: string | number;
  title: string;
  description: string;
  deadline: string;
  status: TaskStatus;
  material_name?: string;
  material_text?: string;
  material_url?: string;
  material_type?: string;
}

interface Material {
  fileName: string;
  url: string;
  type: string;
  text: string;
}

type View = 'dashboard' | 'board' | 'ai' | 'notes';

const uid = (id: string | number) => String(id);

const COLUMNS: { id: TaskStatus; title: string; accent: string; dot: string }[] = [
  { id: 'pending', title: 'Belum', accent: 'text-slate-600', dot: 'bg-slate-400' },
  { id: 'in_progress', title: 'Sedang Dikerjakan', accent: 'text-amber-600', dot: 'bg-amber-500' },
  { id: 'completed', title: 'Selesai', accent: 'text-emerald-600', dot: 'bg-emerald-500' },
];

const daysUntil = (deadline: string) => {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(deadline);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
};

const formatDate = (deadline: string) => {
  if (!deadline) return '';
  const d = new Date(deadline);
  const datePart = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  if (!deadline.includes('T')) return datePart;
  const timePart = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return `${datePart} • ${timePart}`;
};

const toLocalInput = (iso: string) => {
  if (!iso) return '';
  if (!iso.includes('T')) return `${iso}T00:00`;
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function App({ onLogout }: { onLogout: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [aiMap, setAiMap] = useState<Record<string, AIData>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('dashboard');

  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [material, setMaterial] = useState<Material | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [search, setSearch] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [score, setScore] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [confirmTask, setConfirmTask] = useState<Task | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const notify = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, aRes] = await Promise.all([fetch(`${API}/tasks`), fetch(`${API}/ai`)]);
      const tJson = await tRes.json();
      if (tJson.success) setTasks(tJson.data);
      const aJson = await aRes.json();
      if (aJson.success && Array.isArray(aJson.data)) {
        const map: Record<string, AIData> = {};
        aJson.data.forEach((r: any) => {
          map[uid(r.task_id)] = { explanation: r.explanation, answer: r.answer, post_test: r.post_test || [] };
        });
        setAiMap(map);
      }
    } catch {
      notify('Gagal memuat data dari server', 'err');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDeadline('');
    setMaterial(null);
    setEditingTask(null);
  };

  const openAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setDeadline(task.deadline ? toLocalInput(task.deadline) : '');
    setMaterial(
      task.material_name
        ? {
            fileName: task.material_name,
            url: task.material_url || '',
            type: task.material_type || '',
            text: task.material_text || '',
          }
        : null
    );
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API}/upload`, { method: 'POST', body: fd });
      const json = await res.json();
      if (json.success && json.data) {
        setMaterial(json.data);
        notify(`File "${json.data.fileName}" berhasil diproses`);
      } else {
        notify('Gagal memproses file: ' + (json.error || 'Unknown error'), 'err');
      }
    } catch {
      notify('Gagal mengunggah file', 'err');
    } finally {
      setUploading(false);
    }
  };

  const saveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const payload = {
      title,
      description,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      material_name: material?.fileName || null,
      material_text: material?.text || null,
      material_url: material?.url || null,
      material_type: material?.type || null,
    };
    try {
      if (editingTask) {
        const res = await fetch(`${API}/tasks?id=${editingTask.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.success && json.data?.[0]) {
          const updated: Task = json.data[0];
          setTasks(tasks.map((t) => (t.id === editingTask.id ? updated : t)));
          if (selectedTask?.id === editingTask.id) setSelectedTask(updated);
          closeModal();
          notify('Tugas berhasil diperbarui');
        } else {
          notify('Gagal memperbarui: ' + (json.error || 'Unknown error'), 'err');
        }
      } else {
        const res = await fetch(`${API}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, status: 'pending' }),
        });
        const json = await res.json();
        if (json.success && json.data) {
          setTasks([...json.data, ...tasks]);
          closeModal();
          notify('Tugas berhasil disimpan');
        } else {
          notify('Gagal menyimpan: ' + (json.error || 'Unknown error'), 'err');
        }
      }
    } catch {
      notify('Gagal terhubung ke backend', 'err');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (task: Task, status: TaskStatus) => {
    if (task.status === status) return;
    const prev = tasks;
    setTasks(tasks.map((t) => (t.id === task.id ? { ...t, status } : t)));
    try {
      await fetch(`${API}/tasks?id=${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch {
      setTasks(prev);
      notify('Gagal mengubah status', 'err');
    }
  };

  const generateAI = async (task: Task) => {
    setLoadingId(uid(task.id));
    try {
      const res = await fetch(`${API}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          material: task.material_text || '',
          taskId: task.id,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setAiMap((prev) => ({ ...prev, [uid(task.id)]: json.data }));
        notify('Materi & post-test AI siap');
      } else {
        notify('AI gagal: ' + (json.error || 'Unknown error'), 'err');
      }
    } catch {
      notify('Gagal menghubungi AI. Pastikan backend berjalan.', 'err');
    } finally {
      setLoadingId(null);
    }
  };

  const deleteTask = async (id: string | number) => {
    const prev = tasks;
    setTasks(tasks.filter((t) => t.id !== id));
    if (selectedTask?.id === id) setSelectedTask(null);
    try {
      await fetch(`${API}/tasks?id=${id}`, { method: 'DELETE' });
      notify('Tugas dihapus');
    } catch {
      setTasks(prev);
      notify('Gagal menghapus tugas', 'err');
    }
  };

  const openDetail = (task: Task) => {
    setSelectedTask(task);
    setUserAnswers({});
    setScore(null);
  };

  const askDelete = (id: string | number) => {
    const t = tasks.find((x) => x.id === id);
    if (t) setConfirmTask(t);
  };

  const submitQuiz = () => {
    const ai = selectedTask ? aiMap[uid(selectedTask.id)] : undefined;
    if (!ai?.post_test?.length) return;
    let correct = 0;
    ai.post_test.forEach((q, idx) => {
      if (userAnswers[idx] === q.answer) correct++;
    });
    setScore(Math.round((correct / ai.post_test.length) * 100));
  };

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const progress = total ? Math.round((completed / total) * 100) : 0;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const urgent = tasks.filter((t) => {
      if (t.status === 'completed') return false;
      const d = daysUntil(t.deadline);
      return d !== null && d <= 3;
    }).length;
    return { total, completed, inProgress, urgent, progress, pending: total - completed };
  }, [tasks]);

  const upcoming = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== 'completed' && !!t.deadline)
        .map((t) => ({ task: t, d: daysUntil(t.deadline) as number }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 5),
    [tasks]
  );

  const searched = useMemo(
    () =>
      tasks.filter(
        (t) =>
          !search ||
          t.title.toLowerCase().includes(search.toLowerCase()) ||
          t.description?.toLowerCase().includes(search.toLowerCase())
      ),
    [tasks, search]
  );

  const onDragEnd = (e: DragEndEvent) => {
    setDraggingTask(null);
    const over = e.over?.id as TaskStatus | undefined;
    const task = e.active.data.current?.task as Task | undefined;
    if (over && task && COLUMNS.some((c) => c.id === over)) {
      updateStatus(task, over);
    }
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat pagi';
    if (h < 15) return 'Selamat siang';
    if (h < 19) return 'Selamat sore';
    return 'Selamat malam';
  })();

  const deadlineBadge = (task: Task) => {
    if (!task.deadline) return null;
    const d = daysUntil(task.deadline);
    const clock = task.deadline.includes('T')
      ? ' • ' + new Date(task.deadline).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      : '';
    if (task.status === 'completed')
      return { text: formatDate(task.deadline), cls: 'bg-slate-100 text-slate-500 border-slate-200' };
    if (d === null) return { text: formatDate(task.deadline), cls: 'bg-slate-100 text-slate-600 border-slate-200' };
    if (d < 0) return { text: `Terlambat ${Math.abs(d)}h${clock}`, cls: 'bg-rose-50 text-rose-600 border-rose-200' };
    if (d === 0) return { text: `Hari ini${clock}`, cls: 'bg-rose-50 text-rose-600 border-rose-200' };
    if (d <= 3) return { text: `${d} hari lagi${clock}`, cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { text: formatDate(task.deadline), cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  };

  const searchInput = (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Cari tugas..."
        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder-slate-400 focus:border-slate-400"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto flex max-w-[1240px] gap-8 p-4 lg:p-8">
        {/* Sidebar */}
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 lg:flex">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight text-slate-900">StudyDesk</p>
                <p className="text-xs text-slate-400">AI Task Manager</p>
              </div>
            </div>

            <nav className="mt-8 space-y-1">
              <SidebarItem
                icon={<LayoutDashboard className="h-4 w-4" />}
                label="Dashboard"
                active={view === 'dashboard'}
                onClick={() => setView('dashboard')}
              />
              <SidebarItem
                icon={<Columns3 className="h-4 w-4" />}
                label="Board"
                badge={tasks.length}
                active={view === 'board'}
                onClick={() => setView('board')}
              />
              <SidebarItem
                icon={<StickyNote className="h-4 w-4" />}
                label="Catatan"
                active={view === 'notes'}
                onClick={() => setView('notes')}
              />
              <SidebarItem
                icon={<Sparkles className="h-4 w-4" />}
                label="AI Assistant"
                badge={Object.keys(aiMap).length}
                active={view === 'ai'}
                onClick={() => setView('ai')}
              />
            </nav>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Progres</span>
              <span className="text-sm font-semibold text-slate-900">{stats.progress}%</span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                style={{ width: `${stats.progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {stats.completed}/{stats.total} tugas selesai
            </p>
          </div>
        </aside>

        {/* Main */}
        <div className="min-w-0 flex-1">
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 lg:hidden">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{greeting}</h1>
                <p className="mt-0.5 text-sm text-slate-500">Kelola tugas kuliah & belajar lebih pintar dengan AI</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell tasks={tasks} onOpenTask={openDetail} onGoBoard={() => setView('board')} />
              <button
                onClick={onLogout}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm active:scale-95"
                title="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </button>
              <button
                onClick={fetchAll}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                title="Muat ulang"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={openAdd}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" /> Tambah Tugas
              </button>
            </div>
          </header>

          {/* Stats */}
          {view === 'dashboard' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-4"
            >
              <StatCard icon={<ListTodo className="h-5 w-5" />} label="Total Tugas" value={stats.total} tone="indigo" />
              <StatCard icon={<PlayCircle className="h-5 w-5" />} label="Sedang Dikerjakan" value={stats.inProgress} tone="amber" />
              <StatCard icon={<CheckCheck className="h-5 w-5" />} label="Selesai" value={stats.completed} tone="emerald" />
              <StatCard icon={<AlertCircle className="h-5 w-5" />} label="Deadline Dekat" value={stats.urgent} tone="rose" />
            </motion.div>
          )}

          {view === 'ai' && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">AI Study Assistant</p>
                <p className="mt-1 text-sm text-slate-600">
                  Klik tugas untuk membuka penjelasan, kunci jawaban & post-test yang tersimpan.
                </p>
              </div>
            </div>
          )}

          {/* Toolbar */}
          {view === 'board' && (
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-1.5 text-sm text-slate-500">
                <GripVertical className="h-4 w-4" /> Tarik kartu antar kolom untuk ubah status
              </span>
              {searchInput}
            </div>
          )}
          {view === 'ai' && <div className="mb-4 flex justify-end">{searchInput}</div>}

          {/* Content */}
          {view === 'notes' ? (
            <NotesView notify={notify} />
          ) : view === 'dashboard' ? (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_288px]">
              <div className="min-w-0">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-700">Tugas Terbaru</span>
                  {searchInput}
                </div>
                {loading ? (
                  <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-20 text-sm text-slate-400">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat tugas...
                  </div>
                ) : searched.length === 0 ? (
                  <EmptyState hasTasks={tasks.length > 0} onAdd={openAdd} />
                ) : (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: {},
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                        },
                      },
                    }}
                    className="grid grid-cols-1 gap-3 xl:grid-cols-2"
                  >
                    {searched.map((task) => (
                      <motion.div
                        key={task.id}
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          visible: { opacity: 1, y: 0 },
                        }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                      >
                        <TaskCard
                          task={task}
                          ai={aiMap[uid(task.id)]}
                          loading={loadingId === uid(task.id)}
                          onOpen={openDetail}
                          onGenerate={generateAI}
                          onDelete={askDelete}
                          onToggleStatus={updateStatus}
                          onEdit={openEdit}
                          badge={deadlineBadge}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>

              <aside className="hidden space-y-6 lg:block">
                <div className="rounded-lg border border-slate-200 bg-white p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Progres Belajar</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{stats.progress}%</p>
                  <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                      style={{ width: `${stats.progress}%` }}
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>{stats.completed} selesai</span>
                    <span>{stats.pending} tersisa</span>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Deadline Terdekat</p>
                    <button
                      onClick={() => setView('board')}
                      className="text-xs font-medium text-indigo-600 transition hover:text-indigo-700"
                    >
                      Board
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {upcoming.length === 0 ? (
                      <p className="text-sm text-slate-500">Tidak ada deadline aktif.</p>
                    ) : (
                      upcoming.map(({ task }) => {
                        const b = deadlineBadge(task);
                        return (
                          <button key={task.id} onClick={() => openDetail(task)} className="block w-full text-left">
                            <p className="truncate text-sm font-medium text-slate-800">{task.title}</p>
                            <div className="mt-1 flex items-center gap-2">
                              {b && (
                                <span className={`rounded-full border px-2 py-0.5 text-[11px] ${b.cls}`}>{b.text}</span>
                              )}
                              <span className="text-[11px] text-slate-400">{formatDate(task.deadline)}</span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </aside>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-20 text-slate-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat tugas...
            </div>
          ) : view === 'board' ? (
            <DndContext
              sensors={sensors}
              onDragStart={(e) => setDraggingTask((e.active.data.current?.task as Task) || null)}
              onDragEnd={onDragEnd}
              onDragCancel={() => setDraggingTask(null)}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {COLUMNS.map((col, cidx) => (
                  <motion.div
                    key={col.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: cidx * 0.05 }}
                  >
                    <KanbanColumn
                      column={col}
                      tasks={searched.filter((t) => t.status === col.id)}
                      aiMap={aiMap}
                      loadingId={loadingId}
                      onOpen={openDetail}
                      onGenerate={generateAI}
                      onDelete={askDelete}
                      onEdit={openEdit}
                      badge={deadlineBadge}
                    />
                  </motion.div>
                ))}
              </div>
              <DragOverlay dropAnimation={null}>
                {draggingTask ? (
                  <div className="w-72 rotate-2 rounded-lg border border-slate-300 bg-white p-3 shadow-lg">
                    <p className="truncate text-sm font-semibold text-slate-800">{draggingTask.title}</p>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : view === 'ai' ? (
            searched.filter((t) => aiMap[uid(t.id)]).length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100">
                  <Sparkles className="h-8 w-8 text-slate-400" />
                </div>
                <p className="mt-4 font-medium text-slate-700">Belum ada materi AI</p>
                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  Buka Board lalu klik "Tanya AI" pada tugas untuk membuat materi & post-test.
                </p>
                <button
                  onClick={() => setView('board')}
                  className="mt-5 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Columns3 className="h-4 w-4" /> Buka Board
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {searched
                  .filter((t) => aiMap[uid(t.id)])
                  .map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      ai={aiMap[uid(task.id)]}
                      loading={loadingId === uid(task.id)}
                      onOpen={openDetail}
                      onGenerate={generateAI}
                      onDelete={askDelete}
                      onToggleStatus={updateStatus}
                      onEdit={openEdit}
                      badge={deadlineBadge}
                    />
                  ))}
              </div>
            )
          ) : searched.length === 0 ? (
            <EmptyState hasTasks={tasks.length > 0} onAdd={openAdd} />
          ) : (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {searched.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  ai={aiMap[uid(task.id)]}
                  loading={loadingId === uid(task.id)}
                  onOpen={openDetail}
                  onGenerate={generateAI}
                  onDelete={askDelete}
                  onToggleStatus={updateStatus}
                  onEdit={openEdit}
                  badge={deadlineBadge}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg ${
            toast.type === 'ok'
              ? 'border-emerald-200 bg-white text-emerald-700'
              : 'border-rose-200 bg-white text-rose-700'
          }`}
        >
          {toast.type === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {showModal && (
        <AddTaskModal
          title={title}
          description={description}
          deadline={deadline}
          material={material}
          uploading={uploading}
          saving={saving}
          dragOver={dragOver}
          isEditing={!!editingTask}
          setTitle={setTitle}
          setDescription={setDescription}
          setDeadline={setDeadline}
          setDragOver={setDragOver}
          onFile={uploadFile}
          onRemoveMaterial={() => setMaterial(null)}
          onClose={closeModal}
          onSubmit={saveTask}
        />
      )}

      {selectedTask && (
        <AIDrawer
          task={selectedTask}
          ai={aiMap[uid(selectedTask.id)]}
          loading={loadingId === uid(selectedTask.id)}
          userAnswers={userAnswers}
          score={score}
          onAnswer={(i, opt) => setUserAnswers({ ...userAnswers, [i]: opt })}
          onSubmitQuiz={submitQuiz}
          onGenerate={generateAI}
          onClose={() => setSelectedTask(null)}
        />
      )}

      <ConfirmDialog
        open={!!confirmTask}
        title="Hapus tugas ini?"
        message={confirmTask?.title}
        confirmLabel="Hapus"
        onCancel={() => setConfirmTask(null)}
        onConfirm={() => {
          if (confirmTask) deleteTask(confirmTask.id);
          setConfirmTask(null);
        }}
      />
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{badge}</span>
      )}
    </button>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'indigo' | 'amber' | 'emerald' | 'rose';
}) {
  const urgent = tone === 'rose' && value > 0;
  return (
    <div className="bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <span className="text-slate-300">{icon}</span>
      </div>
      <p className={`mt-4 text-3xl font-semibold tracking-tight ${urgent ? 'text-rose-600' : 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  );
}

function MaterialChip({ task }: { task: Task }) {
  if (!task.material_name) return null;
  return (
    <a
      href={task.material_url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => !task.material_url && e.preventDefault()}
      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs text-slate-600 transition hover:bg-slate-50"
    >
      <Paperclip className="h-3 w-3 shrink-0" />
      <span className="truncate">{task.material_name}</span>
      {task.material_url && <ExternalLink className="h-3 w-3 shrink-0" />}
    </a>
  );
}

function TaskCard({
  task,
  ai,
  loading,
  onOpen,
  onGenerate,
  onDelete,
  onToggleStatus,
  onEdit,
  badge,
}: {
  task: Task;
  ai?: AIData;
  loading: boolean;
  onOpen: (t: Task) => void;
  onGenerate: (t: Task) => void;
  onDelete: (id: string | number) => void;
  onToggleStatus: (t: Task, s: TaskStatus) => void;
  onEdit: (t: Task) => void;
  badge: (t: Task) => { text: string; cls: string } | null;
}) {
  const done = task.status === 'completed';
  const b = badge(task);
  return (
    <div className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300">
      <div className="flex items-start gap-3">
        <button onClick={() => onToggleStatus(task, done ? 'pending' : 'completed')} className="mt-0.5 shrink-0" title="Tandai selesai">
          {done ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          ) : (
            <Circle className="h-6 w-6 text-slate-300 transition group-hover:text-indigo-500" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <h3 className={`truncate font-semibold ${done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
            {task.title}
          </h3>
          {task.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{task.description}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {b && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs ${b.cls}`}>
                <Calendar className="h-3 w-3" /> {b.text}
              </span>
            )}
            {task.status === 'in_progress' && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white px-2.5 py-0.5 text-xs text-amber-700">
                <PlayCircle className="h-3 w-3" /> Dikerjakan
              </span>
            )}
            <MaterialChip task={task} />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
        <button
          onClick={() => onOpen(task)}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <LayoutDashboard className="h-3.5 w-3.5" /> Detail
        </button>
        <button
          onClick={() => onGenerate(task)}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? 'Memproses...' : ai ? 'Regenerate' : 'Tanya AI'}
        </button>
        {ai && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            AI siap
          </span>
        )}
        <button
          onClick={() => onEdit(task)}
          className="ml-auto rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
          title="Edit"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="rounded-md p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
          title="Hapus"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function KanbanColumn({
  column,
  tasks,
  aiMap,
  loadingId,
  onOpen,
  onGenerate,
  onDelete,
  onEdit,
  badge,
}: {
  column: { id: TaskStatus; title: string; accent: string; dot: string };
  tasks: Task[];
  aiMap: Record<string, AIData>;
  loadingId: string | null;
  onOpen: (t: Task) => void;
  onGenerate: (t: Task) => void;
  onDelete: (id: string | number) => void;
  onEdit: (t: Task) => void;
  badge: (t: Task) => { text: string; cls: string } | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[420px] flex-col rounded-lg border bg-slate-50/70 p-3 transition ${
        isOver ? 'border-slate-400 bg-slate-100' : 'border-slate-200'
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${column.dot}`} />
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{column.title}</h3>
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
          {tasks.length}
        </span>
      </div>
      <div className="flex-1 space-y-2">
        {tasks.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">
            Tarik tugas ke sini
          </div>
        ) : (
          tasks.map((task, idx) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.02 }}
            >
              <KanbanCard
                task={task}
                ai={aiMap[uid(task.id)]}
                loading={loadingId === uid(task.id)}
                onOpen={onOpen}
                onGenerate={onGenerate}
                onDelete={onDelete}
                onEdit={onEdit}
                badge={badge}
              />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function KanbanCard({
  task,
  ai,
  loading,
  onOpen,
  onGenerate,
  onDelete,
  onEdit,
  badge,
}: {
  task: Task;
  ai?: AIData;
  loading: boolean;
  onOpen: (t: Task) => void;
  onGenerate: (t: Task) => void;
  onDelete: (id: string | number) => void;
  onEdit: (t: Task) => void;
  badge: (t: Task) => { text: string; cls: string } | null;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: uid(task.id),
    data: { task },
  });
  const b = badge(task);
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-slate-200 bg-white p-3 transition hover:border-slate-300 ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start gap-2">
        <button
          {...listeners}
          {...attributes}
          className="mt-0.5 cursor-grab touch-none text-slate-300 hover:text-slate-500 active:cursor-grabbing"
          title="Tarik untuk pindah kolom"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-slate-800">{task.title}</h4>
          {task.description && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{task.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {b && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${b.cls}`}>
                <Calendar className="h-3 w-3" /> {b.text}
              </span>
            )}
            {task.material_name && (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-500">
                <Paperclip className="h-3 w-3" /> File
              </span>
            )}
            {ai && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                AI
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5 border-t border-slate-100 pt-2">
        <button
          onClick={() => onOpen(task)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <LayoutDashboard className="h-3 w-3" /> Detail
        </button>
        <button
          onClick={() => onGenerate(task)}
          disabled={loading}
          className="flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {ai ? 'Regenerate' : 'AI'}
        </button>
        <button
          onClick={() => onEdit(task)}
          className="ml-auto rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
          title="Hapus"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function AddTaskModal({
  title,
  description,
  deadline,
  material,
  uploading,
  saving,
  dragOver,
  isEditing,
  setTitle,
  setDescription,
  setDeadline,
  setDragOver,
  onFile,
  onRemoveMaterial,
  onClose,
  onSubmit,
}: {
  title: string;
  description: string;
  deadline: string;
  material: Material | null;
  uploading: boolean;
  saving: boolean;
  dragOver: boolean;
  isEditing: boolean;
  setTitle: (v: string) => void;
  setDescription: (v: string) => void;
  setDeadline: (v: string) => void;
  setDragOver: (v: boolean) => void;
  onFile: (f: File) => void;
  onRemoveMaterial: () => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            {isEditing ? <Pencil className="h-4 w-4 text-indigo-600" /> : <Plus className="h-4 w-4 text-indigo-600" />}
            {isEditing ? 'Edit Tugas' : 'Tambah Tugas Baru'}
          </h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 p-5">
          <Field label="Judul Tugas / Matkul">
            <input
              autoFocus
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
              placeholder="Contoh: Kalkulus - Integral Tentu"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="Deskripsi / Soal">
            <textarea
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
              placeholder="Detail atau soal tugas..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field label="Deadline (tanggal & jam)">
            <input
              type="datetime-local"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </Field>

          <Field label="Materi / File Pendukung (PDF, Word, PPT, Excel, Gambar)">
            {material ? (
              <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{material.fileName}</p>
                  <p className="text-xs text-slate-500">
                    {material.text ? `${material.text.slice(0, 80)}${material.text.length > 80 ? '…' : ''}` : 'Tidak ada teks terdeteksi'}
                  </p>
                </div>
                <button type="button" onClick={onRemoveMaterial} className="text-slate-400 hover:text-rose-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) onFile(f);
                }}
                onClick={() => inputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-5 text-center transition ${
                  dragOver ? 'border-slate-900 bg-slate-50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
                    <p className="mt-2 text-sm text-slate-500">Memproses file...</p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-7 w-7 text-slate-400" />
                    <p className="mt-2 text-sm text-slate-600">
                      Tarik & lepas file di sini, atau <span className="font-medium text-slate-900">pilih file</span>
                    </p>
                    <p className="text-xs text-slate-400">PDF, DOCX, PPTX, XLSX, JPG, PNG (maks ~15MB)</p>
                  </>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.webp,.gif"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFile(f);
                  }}
                />
              </div>
            )}
          </Field>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || uploading || !title.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {saving ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Simpan Tugas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AIDrawer({
  task,
  ai,
  loading,
  userAnswers,
  score,
  onAnswer,
  onSubmitQuiz,
  onGenerate,
  onClose,
}: {
  task: Task;
  ai?: AIData;
  loading: boolean;
  userAnswers: { [key: number]: string };
  score: number | null;
  onAnswer: (i: number, opt: string) => void;
  onSubmitQuiz: () => void;
  onGenerate: (t: Task) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">AI Study Assistant</p>
              <h3 className="mt-1 max-w-md truncate text-base font-semibold text-slate-900">{task.title}</h3>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {task.material_name && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <Paperclip className="h-4 w-4 text-slate-500" />
              <span className="truncate text-slate-700">{task.material_name}</span>
              {task.material_url && (
                <a
                  href={task.material_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                >
                  Buka <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {!ai ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100">
                <Sparkles className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-4 max-w-sm text-sm text-slate-500">
                Belum ada materi AI untuk tugas ini. Generate penjelasan, kunci jawaban, dan post-test sekarang.
              </p>
              <button
                onClick={() => onGenerate(task)}
                disabled={loading}
                className="mt-5 flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? 'AI sedang berpikir...' : 'Generate dengan AI'}
              </button>
            </div>
          ) : (
            <>
              <Section icon={<Target className="h-4 w-4" />} title="Penjelasan Materi" tone="text-slate-900" body={ai.explanation} />
              <Section icon={<CheckCheck className="h-4 w-4" />} title="Kunci Jawaban / Solusi" tone="text-slate-900" body={ai.answer} />

              {ai.post_test?.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <HelpCircle className="h-4 w-4" /> Post-Test
                    </h4>
                    <button
                      onClick={() => onGenerate(task)}
                      disabled={loading}
                      className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      Regenerate
                    </button>
                  </div>
                  <div className="space-y-4">
                    {ai.post_test.map((q, qIdx) => (
                      <div key={qIdx} className="rounded-lg border border-slate-200 bg-white p-3">
                        <p className="mb-2 text-sm font-medium text-slate-700">
                          {qIdx + 1}. {q.question}
                        </p>
                        <div className="space-y-1.5">
                          {q.options.map((opt, oIdx) => {
                            const chosen = userAnswers[qIdx] === opt;
                            return (
                              <label
                                key={oIdx}
                                className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition ${
                                  chosen
                                    ? 'border-indigo-400 bg-indigo-50 text-slate-900'
                                    : 'border-transparent text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`question-${qIdx}`}
                                  value={opt}
                                  checked={chosen}
                                  onChange={() => onAnswer(qIdx, opt)}
                                  className="h-4 w-4 accent-indigo-600"
                                />
                                {opt}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {score !== null ? (
                    <div className="mt-4 flex items-center justify-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                      <Trophy className="h-6 w-6 text-emerald-600" />
                      <div>
                        <p className="text-sm font-semibold text-emerald-700">Skor Post-Test: {score}%</p>
                        <p className="text-xs text-emerald-600">
                          {score >= 70 ? 'Mantap! Pemahamanmu bagus.' : 'Perlu belajar lagi, semangat!'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={onSubmitQuiz}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      <Send className="h-4 w-4" /> Submit Jawaban Post-Test
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function Section({ icon, title, tone, body }: { icon: React.ReactNode; title: string; tone: string; body: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <h4 className={`mb-2 flex items-center gap-2 text-sm font-semibold ${tone}`}>
        {icon} {title}
      </h4>
      <RichText text={body} />
    </div>
  );
}

function EmptyState({ hasTasks, onAdd }: { hasTasks: boolean; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100">
        <ListTodo className="h-8 w-8 text-slate-400" />
      </div>
      <p className="mt-4 font-medium text-slate-700">{hasTasks ? 'Tidak ada tugas yang cocok' : 'Belum ada tugas'}</p>
      <p className="mt-1 text-sm text-slate-500">
        {hasTasks ? 'Coba ubah kata kunci pencarian.' : 'Mulai dengan menambahkan tugas kuliah pertamamu.'}
      </p>
      {!hasTasks && (
        <button
          onClick={onAdd}
          className="mt-5 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Tambah Tugas
        </button>
      )}
    </div>
  );
}
