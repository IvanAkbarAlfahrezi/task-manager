import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Pin,
  X,
  Loader2,
  StickyNote,
  CheckCircle2,
  Pencil,
} from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  return fetch(url, { ...options });
};

interface Note {
  id: string;
  title: string;
  content?: string;
  color?: string;
  pinned?: boolean;
  updated_at?: string;
}

const COLORS: Record<string, string> = {
  yellow: 'bg-amber-50/70 border-amber-100',
  green: 'bg-emerald-50/70 border-emerald-100',
  blue: 'bg-sky-50/70 border-sky-100',
  pink: 'bg-rose-50/70 border-rose-100',
};

const SWATCH: Record<string, string> = {
  yellow: 'bg-amber-400',
  green: 'bg-emerald-400',
  blue: 'bg-sky-400',
  pink: 'bg-rose-400',
};

export default function NotesView({ notify }: { notify: (m: string, t?: 'ok' | 'err') => void }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState('yellow');
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API}/notes`);
      const json = await res.json();
      if (json.success) setNotes(json.data);
      else notify('Gagal memuat catatan: ' + (json.error || ''), 'err');
    } catch {
      notify('Gagal memuat catatan', 'err');
    } finally {
      setLoading(false);
    }
  }

  const openAdd = () => {
    setEditing(null);
    setTitle('');
    setContent('');
    setColor('yellow');
    setShowForm(true);
  };

  const openEdit = (n: Note) => {
    setEditing(n);
    setTitle(n.title);
    setContent(n.content || '');
    setColor(n.color || 'yellow');
    setShowForm(true);
  };

  const closeModal = () => {
    setShowForm(false);
    setEditing(null);
  };

  const saveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        const res = await fetchWithAuth(`${API}/notes?id=${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, color }),
        });
        const json = await res.json();
        if (json.success && json.data?.[0]) {
          setNotes((prev) =>
            prev
              .map((n) => (n.id === editing.id ? json.data[0] : n))
              .sort(sortNotes)
          );
          closeModal();
          notify('Catatan diperbarui');
        } else notify('Gagal memperbarui: ' + (json.error || ''), 'err');
      } else {
        const res = await fetchWithAuth(`${API}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, color, pinned: false }),
        });
        const json = await res.json();
        if (json.success && json.data) {
          setNotes([json.data[0], ...notes]);
          closeModal();
          notify('Catatan ditambahkan');
        } else notify('Gagal menyimpan: ' + (json.error || ''), 'err');
      }
    } catch {
      notify('Gagal terhubung ke backend', 'err');
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (n: Note) => {
    const next = !n.pinned;
    setNotes((prev) => prev.map((x) => (x.id === n.id ? { ...x, pinned: next } : x)).sort(sortNotes));
    try {
      await fetchWithAuth(`${API}/notes?id=${n.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: next }),
      });
    } catch {
      setNotes((prev) => prev.map((x) => (x.id === n.id ? { ...x, pinned: !next } : x)).sort(sortNotes));
      notify('Gagal mengubah pin', 'err');
    }
  };

  const deleteNote = async (id: string) => {
    const prev = notes;
    setNotes((p) => p.filter((n) => n.id !== id));
    try {
      await fetchWithAuth(`${API}/notes?id=${id}`, { method: 'DELETE' });
      notify('Catatan dihapus');
    } catch {
      setNotes(prev);
      notify('Gagal menghapus catatan', 'err');
    }
  };

  const filtered = useMemo(
    () =>
      notes.filter(
        (n) =>
          !search ||
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          (n.content || '').toLowerCase().includes(search.toLowerCase())
      ),
    [notes, search]
  );

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari catatan..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder-slate-400 focus:border-slate-400"
          />
        </div>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Catatan Baru
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-20 text-slate-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat catatan...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100">
            <StickyNote className="h-8 w-8 text-slate-400" />
          </div>
          <p className="mt-4 font-medium text-slate-700">
            {notes.length === 0 ? 'Belum ada catatan' : 'Tidak ada catatan yang cocok'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {notes.length === 0 ? 'Catat poin penting kuliahmu di sini.' : 'Coba ubah kata kunci pencarian.'}
          </p>
          {notes.length === 0 && (
            <button
              onClick={openAdd}
              className="mt-5 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> Tambah Catatan
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((n) => (
            <div
              key={n.id}
              className={`group relative rounded-lg border p-4 transition hover:border-slate-300 ${
                COLORS[n.color || 'yellow'] || COLORS.yellow
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="min-w-0 flex-1 break-words text-sm font-semibold text-slate-800">{n.title}</h3>
                <button
                  onClick={() => togglePin(n)}
                  title={n.pinned ? 'Lepas pin' : 'Sematkan'}
                  className={`shrink-0 rounded-md p-1.5 transition ${
                    n.pinned ? 'text-indigo-600' : 'text-slate-300 opacity-0 hover:text-indigo-600 group-hover:opacity-100'
                  }`}
                >
                  <Pin className="h-4 w-4" />
                </button>
              </div>

              {n.content && (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600 line-clamp-6">
                  {n.content}
                </p>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-2">
                <span className="text-[11px] text-slate-500">
                  {n.updated_at ? new Date(n.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(n)}
                    className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/70 hover:text-indigo-600"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setConfirmId(n.id)}
                    className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/70 hover:text-rose-500"
                    title="Hapus"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {n.pinned && (
                <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600">
                  <Pin className="h-3.5 w-3.5 text-white" />
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                {editing ? <Pencil className="h-5 w-5 text-indigo-600" /> : <StickyNote className="h-5 w-5 text-indigo-600" />}
                {editing ? 'Edit Catatan' : 'Catatan Baru'}
              </h2>
              <button onClick={closeModal} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={saveNote} className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-600">Judul</label>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Rumus Integral Penting"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-600">Isi Catatan</label>
                <textarea
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Tulis poin pentingmu di sini..."
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-600">Warna</label>
                <div className="flex gap-2">
                  {Object.keys(COLORS).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-8 w-8 rounded-full ${SWATCH[c]} transition ${
                        color === c ? 'ring-2 ring-slate-900 ring-offset-2' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={c}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Simpan Catatan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmId}
        title="Hapus catatan ini?"
        message={notes.find((n) => n.id === confirmId)?.title}
        confirmLabel="Hapus"
        onCancel={() => setConfirmId(null)}
        onConfirm={() => {
          if (confirmId) deleteNote(confirmId);
          setConfirmId(null);
        }}
      />
    </div>
  );
}

function sortNotes(a: Note, b: Note) {
  if (!!b.pinned !== !!a.pinned) return a.pinned ? -1 : 1;
  return (b.updated_at || '').localeCompare(a.updated_at || '');
}
