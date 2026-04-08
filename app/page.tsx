'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type ItemType = 'note' | 'link' | 'file' | 'image' | 'audio';
type InboxItem = {
  id: string;
  type: ItemType;
  title: string | null;
  content: string | null;
  url: string | null;
  file_path: string | null;
  file_name: string | null;
  device_name: string | null;
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
};
type ClipboardHistoryItem = {
  id: string;
  type: 'text' | 'image';
  content: string;
  snippet: string;
  copied_at: number;
};

const safeGetStorage = (key: string) => {
  try { return window.localStorage.getItem(key); } catch { return null; }
};
const safeSetStorage = (key: string, value: string) => {
  try { window.localStorage.setItem(key, value); } catch {}
};

const fallbackCopy = (text: string) => {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '0';
  textArea.style.top = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch {}
  document.body.removeChild(textArea);
  return ok;
};

const copyToClipboard = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return true; } catch {}
  }
  return fallbackCopy(text);
};

const initialItems: InboxItem[] = [
  { id: '1', type: 'note', title: 'MVP Updates', content: '1. Added Voice Memos\n2. Real-time Search\n3. Archiving System\n4. Bug fixes', url: null, file_path: null, file_name: null, device_name: 'MacBook Pro', is_pinned: true, is_archived: false, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', type: 'link', title: 'Design Inspiration', content: 'Look at this later.', url: 'https://awwwards.com', file_path: null, file_name: null, device_name: 'iPhone 15', is_pinned: false, is_archived: false, created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: '3', type: 'note', title: 'Old Note', content: 'This is an old note I already dealt with.', url: null, file_path: null, file_name: null, device_name: 'Windows', is_pinned: false, is_archived: true, created_at: new Date(Date.now() - 86400000).toISOString() },
];

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => {
    const saved = safeGetStorage('send-to-me-theme') as 'dark' | 'light' | null;
    if (saved) setTheme(saved);
  }, []);
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    safeSetStorage('send-to-me-theme', next);
  };
  return { theme, toggle };
}

function App() {
  const { theme, toggle } = useTheme();
  const [type, setType] = useState<ItemType>('note');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [items, setItems] = useState<InboxItem[]>(initialItems);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ItemType>('all');
  const [archivedOnly, setArchivedOnly] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [clipboardHistory, setClipboardHistory] = useState<ClipboardHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [toast, setToast] = useState('');
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2000);
  };

  const addItem = (p: Partial<InboxItem>) => {
    setItems((prev) => [{
      id: Math.random().toString(36).slice(2),
      type: p.type || 'note',
      title: p.title || null,
      content: p.content || null,
      url: p.url || null,
      file_path: p.file_path || null,
      file_name: p.file_name || null,
      device_name: p.device_name || 'This Device',
      is_pinned: false,
      is_archived: false,
      created_at: new Date().toISOString(),
    }, ...prev]);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addItem({
      type,
      title: title || null,
      content: type === 'note' || type === 'link' ? content || null : null,
      url: type === 'link' ? url || null : null,
    });
    setTitle('');
    setContent('');
    setUrl('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleCopy = async (value: string, t: 'text' | 'image', isRecopy = false) => {
    await copyToClipboard(value);
    if (!isRecopy) {
      setClipboardHistory((prev) => [{ id: Math.random().toString(36).slice(2), type: t, content: value, snippet: t === 'image' ? 'Image URL' : value.slice(0, 80), copied_at: Date.now() }, ...prev].slice(0, 10));
    }
    setShowHistory(false);
    showToast('Copied!');
  };

  const uploadFile = (file: File | undefined) => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    addItem({
      type: file.type.startsWith('image/') ? 'image' : 'file',
      title: title || file.name,
      file_name: file.name,
      file_path: objectUrl,
    });
  };

  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e: BlobEvent) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const objectUrl = URL.createObjectURL(blob);
        addItem({ type: 'audio', title: title || `Voice Memo - ${new Date().toLocaleTimeString()}`, file_path: objectUrl });
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      setRecording(true);
    } catch {
      alert('Microphone unavailable in this browser.');
    }
  };

  const filtered = useMemo(() => {
    return items
      .filter((item) => item.is_archived === archivedOnly)
      .filter((item) => (typeFilter === 'all' ? true : item.type === typeFilter))
      .filter((item) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return !!(item.title?.toLowerCase().includes(q) || item.content?.toLowerCase().includes(q) || item.url?.toLowerCase().includes(q));
      })
      .sort((a, b) => a.is_pinned === b.is_pinned ? +new Date(b.created_at) - +new Date(a.created_at) : a.is_pinned ? -1 : 1);
  }, [items, archivedOnly, typeFilter, search]);

  return (
    <main className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Send to Me</h1>
          <div className="flex gap-2">
            <button className="rounded border px-3 py-2" onClick={() => setShowHistory(true)}>History ({clipboardHistory.length})</button>
            <button className="rounded border px-3 py-2" onClick={toggle}>{theme === 'dark' ? 'Light' : 'Dark'}</button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[360px_1fr]">
          <form onSubmit={handleSave} className="rounded-xl border p-4">
            <h2 className="mb-3 text-lg font-semibold">Quick Capture</h2>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {(['note', 'link', 'file', 'image', 'audio'] as ItemType[]).map((t) => (
                <button key={t} type="button" className={`rounded border px-2 py-2 text-sm ${type === t ? 'bg-blue-500 text-white' : ''}`} onClick={() => setType(t)}>
                  {t}
                </button>
              ))}
            </div>
            <input className="mb-3 w-full rounded border p-2" placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
            {(type === 'note' || type === 'link') && <textarea className="mb-3 min-h-28 w-full rounded border p-2" placeholder="Content..." value={content} onChange={(e) => setContent(e.target.value)} />}
            {type === 'link' && <input className="mb-3 w-full rounded border p-2" placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} required />}
            {(type === 'file' || type === 'image') && <input ref={fileRef} type="file" className="mb-3 w-full rounded border p-2" accept={type === 'image' ? 'image/*' : undefined} onChange={(e) => uploadFile(e.target.files?.[0])} />}
            {type === 'audio' && <button type="button" className="mb-3 rounded border px-3 py-2" onClick={toggleRecording}>{recording ? 'Stop & Save' : 'Start Recording'}</button>}
            {(type === 'note' || type === 'link') && <button className="rounded bg-blue-600 px-4 py-2 text-white" type="submit">Save</button>}
          </form>

          <section className="rounded-xl border p-4">
            <div className="mb-4 flex flex-wrap gap-2">
              <input className="min-w-56 flex-1 rounded border p-2" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="rounded border p-2" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as 'all' | ItemType)}>
                <option value="all">All types</option><option value="note">Note</option><option value="link">Link</option><option value="file">File</option><option value="image">Image</option><option value="audio">Audio</option>
              </select>
              <button className="rounded border px-3 py-2" onClick={() => setArchivedOnly((v) => !v)}>{archivedOnly ? 'View Inbox' : 'View Archive'}</button>
            </div>
            <div className="space-y-3">
              {filtered.length === 0 && <p className="text-sm opacity-70">No items match your filters.</p>}
              {filtered.map((item) => (
                <article key={item.id} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <strong className="capitalize">{item.type}</strong>
                    <span className="text-xs opacity-70">{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                  {item.title && <h3 className="mb-2 font-semibold">{item.title}</h3>}
                  {item.content && (
                    <div className="mb-2 rounded border">
                      {editingId === item.id ? (
                        <textarea className="w-full p-2" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
                      ) : (
                        <p className="whitespace-pre-wrap p-2">{item.content}</p>
                      )}
                    </div>
                  )}
                  {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="mb-2 block text-blue-500 underline">{item.url}</a>}
                  {item.type === 'image' && item.file_path && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.file_path} alt="Preview" className="mb-2 max-h-72 w-full rounded border object-contain" />
                  )}
                  {item.type === 'audio' && item.file_path && <audio controls src={item.file_path} className="mb-2 w-full" />}
                  {item.type === 'file' && item.file_name && <p className="mb-2 text-sm opacity-80">{item.file_name}</p>}
                  <div className="flex flex-wrap gap-2">
                    {item.content && <button className="rounded border px-2 py-1 text-sm" onClick={() => handleCopy(item.content || '', 'text')}>Copy</button>}
                    {item.url && <button className="rounded border px-2 py-1 text-sm" onClick={() => handleCopy(item.url || '', 'text')}>Copy URL</button>}
                    {item.type === 'image' && item.file_path && <button className="rounded border px-2 py-1 text-sm" onClick={() => handleCopy(item.file_path || '', 'image')}>Copy Image URL</button>}
                    {item.content && (
                      <button className="rounded border px-2 py-1 text-sm" onClick={() => {
                        if (editingId === item.id) {
                          setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, content: editValue } : i));
                          setEditingId(null);
                        } else {
                          setEditingId(item.id);
                          setEditValue(item.content || '');
                        }
                      }}>{editingId === item.id ? 'Save' : 'Edit'}</button>
                    )}
                    <button className="rounded border px-2 py-1 text-sm" onClick={() => setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_pinned: !i.is_pinned } : i))}>{item.is_pinned ? 'Unpin' : 'Pin'}</button>
                    <button className="rounded border px-2 py-1 text-sm" onClick={() => setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_archived: !i.is_archived } : i))}>{item.is_archived ? 'Unarchive' : 'Archive'}</button>
                    <button className="rounded border px-2 py-1 text-sm text-red-500" onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>

      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowHistory(false); }}>
          <div className="mx-auto max-h-[80vh] max-w-xl overflow-auto rounded-xl bg-white p-4 text-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Clipboard History</h2>
              <button onClick={() => setShowHistory(false)}>Close</button>
            </div>
            {clipboardHistory.length === 0 && <p className="text-sm opacity-70">History is empty.</p>}
            <div className="space-y-2">
              {clipboardHistory.map((h) => (
                <button key={h.id} className="w-full rounded border p-2 text-left" onClick={() => handleCopy(h.content, h.type, true)}>
                  <div className="text-xs opacity-70">{new Date(h.copied_at).toLocaleTimeString()}</div>
                  <div>{h.snippet}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded bg-emerald-400 px-4 py-2 text-black">{toast}</div>}
    </main>
  );
}

export default App;
