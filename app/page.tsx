'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createClient, type User } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wngqphzpxhderwfjjzla.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduZ3FwaHpweGhkZXJ3ZmpqemxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMjA1MjEsImV4cCI6MjA2NDY5NjUyMX0.mR5kB3wAYUXkwP17wjU-DXidL2E8cReVHvrNh8IWnRU';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 0. SAFE STORAGE & CLIPBOARD HELPERS
// ==========================================
const safeGetStorage = (key: string) => {
  try { return window.localStorage.getItem(key); }
  catch (e) { return null; }
};
const safeSetStorage = (key: string, value: string) => {
  try { window.localStorage.setItem(key, value); }
  catch (e) { console.warn("Storage blocked"); }
};

const copyToClipboard = (text: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => resolve(true)).catch(() => resolve(fallbackCopy(text)));
    } else {
      resolve(fallbackCopy(text));
    }
  });
};

const fallbackCopy = (text: string): boolean => {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.top = "0"; textArea.style.left = "0"; textArea.style.position = "fixed";
  document.body.appendChild(textArea); textArea.focus(); textArea.select();
  let successful = false;
  try { successful = document.execCommand('copy'); } catch (err) {}
  document.body.removeChild(textArea); return successful;
};

// ==========================================
// 1. ERROR BOUNDARY
// ==========================================
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) { console.error("App error:", error, errorInfo); }
  render() {
    if (this.state.hasError) return (
      <div style={{ padding: '2rem', color: '#ff7b7b', background: '#0b1220', minHeight: '100vh' }}>
        <h2>Oops, something went wrong.</h2>
        <pre style={{ background: '#111a2d', padding: '1rem', borderRadius: '8px', overflowX: 'auto', color: '#f3f6fb' }}>{this.state.error?.toString()}</pre>
      </div>
    );
    return this.props.children;
  }
}

// ==========================================
// 2. STYLES & THEMING
// ==========================================
const globalStyles = `
:root {
  --bg-color: #0b1220;
  --bg-gradient: linear-gradient(135deg, #08101d 0%, #0f182b 100%);
  --panel: rgba(22, 33, 58, 0.4);
  --panel-solid: #111a2d;
  --panel-hover: rgba(30, 43, 72, 0.6);
  --text: #f3f6fb;
  --text-inverse: #0f172a;
  --muted: #94a3b8;
  --border: rgba(56, 75, 110, 0.4);
  --border-focus: rgba(94, 166, 255, 0.6);
  --accent: #5ea6ff;
  --accent-hover: #4b89dc;
  --accent-glow: rgba(94, 166, 255, 0.2);
  --danger: #ff7b7b;
  --danger-hover: #e56060;
  --danger-bg: rgba(255, 123, 123, 0.1);
  --success: #88d498;
  --warning: #fbbf24;
  --shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  --glass-blur: blur(16px);
  --modal-bg: rgba(11, 18, 32, 0.8);
}

[data-theme="light"] {
  --bg-color: #f8fafc;
  --bg-gradient: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  --panel: rgba(255, 255, 255, 0.6);
  --panel-solid: #ffffff;
  --panel-hover: rgba(255, 255, 255, 0.9);
  --text: #0f172a;
  --text-inverse: #ffffff;
  --muted: #64748b;
  --border: rgba(203, 213, 225, 0.8);
  --border-focus: rgba(59, 130, 246, 0.6);
  --accent: #3b82f6;
  --accent-hover: #2563eb;
  --accent-glow: rgba(59, 130, 246, 0.2);
  --danger: #ef4444;
  --danger-hover: #dc2828;
  --danger-bg: rgba(239, 68, 68, 0.1);
  --shadow: 0 12px 40px rgba(148, 163, 184, 0.15);
  --modal-bg: rgba(248, 250, 252, 0.6);
}

* { box-sizing: border-box; }
body, html { margin: 0; padding: 0; height: 100%; overflow-x: hidden; }
p, h1, h2, h3, div, span, a { overflow-wrap: break-word; word-wrap: break-word; word-break: break-word; }

.app-wrapper {
  min-height: 100vh; background: var(--bg-gradient); background-color: var(--bg-color);
  color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  transition: background 0.4s ease, color 0.4s ease;
}

@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes toastSlide { 0%, 100% { transform: translateX(-50%) translateY(100px); opacity: 0; } 10%, 90% { transform: translateX(-50%) translateY(0); opacity: 1; } }
@keyframes modalFadeIn { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(8px); } }
@keyframes modalScaleIn { from { transform: scale(0.95) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }

.anim-pulse { animation: pulse 1.5s infinite; }
.item-card { animation: slideUp 0.4s ease-out forwards; opacity: 0; }

.container { width: min(1000px, calc(100% - 32px)); margin: 0 auto; }
.card { background: var(--panel); backdrop-filter: var(--glass-blur); border: 1px solid var(--border); border-radius: 20px; box-shadow: var(--shadow); }
.grid { display: grid; gap: 16px; }
.row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.space-between { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.responsive-stack { display: flex; justify-content: space-between; gap: 16px; align-items: center; }

/* Forms */
.input, .textarea, .select {
  width: 100%; background: var(--panel-solid); color: var(--text); border: 1px solid var(--border);
  border-radius: 12px; padding: 14px 16px; outline: none; transition: all 0.2s ease;
}
.input:focus, .textarea:focus, .select:focus { border-color: var(--border-focus); box-shadow: 0 0 0 3px var(--accent-glow); }
.textarea { min-height: 120px; resize: vertical; line-height: 1.5; }
.search-wrapper { position: relative; width: 100%; flex: 1; }
.search-wrapper svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--muted); }
.search-wrapper .input { padding-left: 42px; }

/* Buttons */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 0;
  border-radius: 12px; padding: 12px 18px; background: var(--accent); color: var(--text-inverse);
  font-weight: 600; cursor: pointer; transition: all 0.2s ease;
}
.btn:hover { background: var(--accent-hover); transform: translateY(-1px); }
.btn:active { transform: translateY(1px); }
.btn.secondary { background: var(--panel-solid); color: var(--text); border: 1px solid var(--border); }
.btn.secondary:hover { background: var(--panel-hover); border-color: var(--border-focus); }
.btn.danger { background: var(--danger-bg); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.3); }
.btn.danger:hover { background: var(--danger); color: white; }
.btn.icon-only { padding: 10px; border-radius: 10px; }
.btn.small { padding: 6px 12px; font-size: 13px; border-radius: 8px; }

/* Segmented Control - Dynamic Grid */
.segment-group { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; background: var(--panel-solid); padding: 6px; border-radius: 14px; border: 1px solid var(--border); }
.segment-btn {
  background: transparent; color: var(--muted); border: none; padding: 10px 4px; border-radius: 10px;
  font-weight: 500; cursor: pointer; transition: all 0.3s ease; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-size: 13px; line-height: 1.1;
}
.segment-btn:hover { color: var(--text); }
.segment-btn.active { background: var(--panel); color: var(--text); box-shadow: 0 2px 10px rgba(0,0,0,0.1); border: 1px solid var(--border); }
.segment-btn span { white-space: nowrap; }

/* Actions */
.copy-action-wrapper { border: 1px solid var(--border); border-radius: 12px; overflow: hidden; background: var(--panel); }
.copy-action-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--panel-solid); border-bottom: 1px solid var(--border); }

/* Badges */
.badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; background: var(--panel-solid); border: 1px solid var(--border); color: var(--text); font-size: 12px; font-weight: 500; }
.badge.pinned { border-color: var(--warning); color: var(--warning); background: rgba(251, 191, 36, 0.1); }
.badge.archived { opacity: 0.7; }
.muted { color: var(--muted); }

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--modal-bg);
  animation: modalFadeIn 0.2s ease-out;
}
.modal-content { animation: modalScaleIn 0.2s ease-out; box-shadow: var(--shadow); }
.history-item:hover { background: var(--panel-hover); }
.history-row { position: relative; overflow: hidden; border-radius: 12px; border-bottom: 1px solid var(--border); }
.history-item {
  position: relative;
  z-index: 2;
  transition: transform 0.2s ease;
  touch-action: pan-y;
  background: transparent;
}
.history-item.swiped { transform: translateX(-84px); }
.history-delete {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 84px;
  border: 0;
  background: var(--danger);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

/* Audio Player styling */
audio { width: 100%; height: 40px; border-radius: 8px; outline: none; }
audio::-webkit-media-controls-panel { background-color: var(--panel-solid); }
audio::-webkit-media-controls-play-button, audio::-webkit-media-controls-mute-button { filter: invert(1); }
[data-theme="light"] audio::-webkit-media-controls-play-button, [data-theme="light"] audio::-webkit-media-controls-mute-button { filter: invert(0); }

/* Custom Scrollbar */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--muted); }

@media (max-width: 768px) {
  .responsive-stack { align-items: flex-start; flex-direction: column; }
  .responsive-stack > div { width: 100%; max-width: 100% !important; }
  .grid { grid-template-columns: 1fr !important; }
  .segment-group { grid-template-columns: repeat(3, 1fr); }
  .action-row { width: 100%; justify-content: space-between; }
}
`;

// ==========================================
// 3. ICONS
// ==========================================
const Icons = {
  Send: () => <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>,
  Note: () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Link: () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>,
  File: () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>,
  Image: () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>,
  Mic: () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>,
  Square: () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="currentColor" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>,
  Pin: () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1v3.76z"></path></svg>,
  Archive: () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>,
  Trash: () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Edit: () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  Search: () => <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  Sun: () => <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>,
  Moon: () => <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>,
  Copy: () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>,
  Clipboard: () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>,
  Check: () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="3" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  X: () => <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
};

// ==========================================
// 4. TYPES & INITIAL DATA
// ==========================================
export type ItemType = 'note' | 'link' | 'file' | 'image' | 'audio';

export type InboxItem = {
  id: string; type: ItemType; title: string | null; content: string | null; url: string | null;
  file_path: string | null; file_name: string | null; device_name: string | null;
  is_pinned: boolean; is_archived: boolean; created_at: string; preview_url?: string | null;
};

export type ClipboardHistoryItem = { id: string; type: 'text' | 'image'; content: string; snippet: string; copied_at: number; };

const INITIAL_MOCK_ITEMS: InboxItem[] = [
  { id: '1', type: 'note', title: 'MVP Updates', content: '1. Added Voice Memos\n2. Real-time Search\n3. Archiving System\n4. Bug fixes', url: null, file_path: null, file_name: null, device_name: 'MacBook Pro', is_pinned: true, is_archived: false, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', type: 'link', title: 'Design Inspiration', content: 'Look at this later.', url: 'https://awwwards.com', file_path: null, file_name: null, device_name: 'iPhone 15', is_pinned: false, is_archived: false, created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: '3', type: 'note', title: 'Old Note', content: 'This is an old note I already dealt with.', url: null, file_path: null, file_name: null, device_name: 'Windows', is_pinned: false, is_archived: true, created_at: new Date(Date.now() - 86400000).toISOString() },
];

type AddItemPayload = {
  type: ItemType;
  title?: string | null;
  content?: string | null;
  url?: string | null;
  file_name?: string | null;
  device_name?: string | null;
  file?: File | Blob | null;
};

// ==========================================
// 5. HOOKS
// ==========================================
function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => {
    const saved = safeGetStorage('send-to-me-theme') as 'dark' | 'light';
    if (saved) setTheme(saved);
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) setTheme('light');
  }, []);
  const toggleTheme = () => { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); safeSetStorage('send-to-me-theme', next); };
  return { theme, toggleTheme };
}

// ==========================================
// 6. COMPONENTS
// ==========================================
function Composer({ deviceName, onAddItem, onTriggerPaste }: { deviceName: string; onAddItem: (payload: AddItemPayload) => Promise<void>; onTriggerPaste: () => Promise<void>; }) {
  const [type, setType] = useState<ItemType>('note');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  function reset() { setTitle(''); setContent(''); setUrl(''); if (fileRef.current) fileRef.current.value = ''; }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    await onAddItem({ type, title: title || null, content: content || null, url: type === 'link' ? url || null : null, device_name: deviceName || null });
    reset();
  }

  function uploadFile(e: React.ChangeEvent<HTMLInputElement> | any) {
    const file = e.target?.files?.[0] || e.dataTransfer?.files?.[0];
    if (!file) return;
    setUploading(true);
    onAddItem({
      type: file.type.startsWith('image/') ? 'image' : 'file',
      title: title || file.name,
      file_name: file.name,
      device_name: deviceName,
      file,
    }).finally(() => {
      setUploading(false);
      reset();
    });
  }

  async function toggleRecording() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = (e: any) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          onAddItem({ type: 'audio', title: title || `Voice Memo - ${new Date().toLocaleTimeString()}`, file_name: `${Date.now()}.webm`, file: blob, device_name: deviceName });
          reset();
          // Stop mic tracks
          stream.getTracks().forEach(track => track.stop());
        };
        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) {
        alert("Microphone access denied or not available in this preview environment.");
      }
    }
  }

  // Global Paste Listener
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Don't intercept if user is actively typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const pastedText = e.clipboardData?.getData('text');
      if (pastedText) {
        setContent(pastedText);
        const isLink = /^https?:\/\//i.test(pastedText);
        setType(isLink ? 'link' : 'note');
        if (isLink) setUrl(pastedText);
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      saveItem(e as any);
    }
  };

  return (
    <div
      className="card"
      style={{
        padding: 24,
        border: isDragging ? '2px dashed var(--accent)' : '1px solid var(--border)',
        background: isDragging ? 'var(--panel-hover)' : 'var(--panel)',
        transition: 'all 0.2s'
      }}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault(); setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) uploadFile(e as any);
      }}
    >
      <div className="space-between" style={{ marginBottom: 20 }}>
        <div><h2 style={{ margin: 0, fontSize: '20px' }}>Quick Capture</h2></div>
        <button className="btn secondary small" onClick={onTriggerPaste}><Icons.Copy /> Paste OS</button>
      </div>

      <form className="grid" onSubmit={saveItem}>
        <div className="segment-group">
          {([{t:'note',i:<Icons.Note/>}, {t:'link',i:<Icons.Link/>}, {t:'file',i:<Icons.File/>}, {t:'image',i:<Icons.Image/>}, {t:'audio',i:<Icons.Mic/>} ] as const).map(({t, i}) => (
            <button key={t} type="button" className={`segment-btn ${type === t ? 'active' : ''}`} onClick={() => setType(t as ItemType)}>
              {i} <span style={{ textTransform: 'capitalize' }}>{t}</span>
            </button>
          ))}
        </div>

        <input className="input" placeholder={type==='audio'?"Memo Title (optional)":"Title (optional)"} value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={handleKeyDown} />

        {['note', 'link'].includes(type) && <textarea className="textarea" placeholder={type === 'note' ? 'Write a note...\n(Pro tip: Ctrl+Enter to save)' : 'Add context...\n(Pro tip: Ctrl+Enter to save)'} value={content} onChange={(e) => setContent(e.target.value)} onKeyDown={handleKeyDown} />}
        {type === 'link' && <input className="input" placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} required onKeyDown={handleKeyDown} />}
        {['file', 'image'].includes(type) && (
          <div style={{ position: 'relative' }}>
             <input ref={fileRef} className="input" type="file" accept={type === 'image' ? 'image/*' : undefined} onChange={uploadFile} style={{ padding: '24px 16px', background: 'var(--panel)' }} />
             <div className="muted" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', background: 'var(--panel-solid)', padding: '4px 12px', borderRadius: 8 }}>
               Or drag & drop here
             </div>
          </div>
        )}

        {type === 'audio' && (
          <div style={{ padding: '32px 16px', background: 'var(--panel)', borderRadius: 12, textAlign: 'center', border: `1px solid ${isRecording ? 'var(--danger)' : 'var(--border)'}` }}>
            {isRecording ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--danger)' }} className="anim-pulse" />
                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Recording...</span>
                <button type="button" className="btn danger" onClick={toggleRecording}><Icons.Square /> Stop & Save</button>
              </div>
            ) : (
              <button type="button" className="btn secondary" onClick={toggleRecording}><Icons.Mic /> Start Recording</button>
            )}
          </div>
        )}

        {['note', 'link'].includes(type) && <button className="btn" type="submit">{uploading ? 'Uploading...' : `Save ${type}`}</button>}
      </form>
    </div>
  );
}

// ==========================================
// 7. APP CONTENT (MAIN)
// ==========================================
function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const [deviceName] = useState('This Device');
  const [user, setUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [toast, setToast] = useState<{id: number, msg: string} | null>(null);
  const [clipboardHistory, setClipboardHistory] = useState<ClipboardHistoryItem[]>([]);
  const [swipedHistoryId, setSwipedHistoryId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchDeltaXRef = useRef(0);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ItemType>('all');
  const [viewArchived, setViewArchived] = useState(false);

  // Inline Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const showToast = (msg: string) => setToast({ id: Date.now(), msg });
  const clearToastLater = (id: number) => setTimeout(() => setToast((current) => current?.id === id ? null : current), 3000);

  async function hydrateRows(rows: any[]): Promise<InboxItem[]> {
    return Promise.all(rows.map(async (row) => {
      let preview_url: string | null = null;
      if (row.file_path && (row.type === 'image' || row.type === 'audio')) {
        const { data } = await supabase.storage.from('stm-files').createSignedUrl(row.file_path, 60 * 60 * 24);
        preview_url = data?.signedUrl || null;
      }
      return {
        id: row.id,
        type: row.type,
        title: row.title,
        content: row.content,
        url: row.url,
        file_path: row.file_path,
        file_name: row.file_name,
        device_name: row.device_name,
        is_pinned: !!row.is_pinned,
        is_archived: !!row.is_archived,
        created_at: row.created_at,
        preview_url,
      } as InboxItem;
    }));
  }

  async function loadInbox(currentUser: User) {
    const { data, error } = await supabase
      .from('stm_inbox_items')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    if (error) { showToast(`Inbox load failed: ${error.message}`); return; }
    const mapped = await hydrateRows(data || []);
    setItems(mapped);
  }

  async function loadClipboardHistory(currentUser: User) {
    const { data, error } = await supabase
      .from('stm_clipboard_history')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('copied_at', { ascending: false })
      .limit(20);
    if (error) { showToast(`History load failed: ${error.message}`); return; }
    setClipboardHistory((data || []).map((row) => ({
      id: row.id,
      type: row.type,
      content: row.content,
      snippet: row.snippet,
      copied_at: new Date(row.copied_at).getTime(),
    })));
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setUser(data.session?.user || null);
      if (data.session?.user) {
        await Promise.all([loadInbox(data.session.user), loadClipboardHistory(data.session.user)]);
      }
      setAuthLoading(false);
    })();
    const { data: authSub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        await Promise.all([loadInbox(session.user), loadClipboardHistory(session.user)]);
      } else {
        setItems([]);
        setClipboardHistory([]);
      }
    });
    return () => { mounted = false; authSub.subscription.unsubscribe(); };
  }, []);

  const addItem = async (p: AddItemPayload) => {
    if (!user) {
      const tempUrl = p.file ? URL.createObjectURL(p.file) : null;
      setItems((prev) => [{
        id: Math.random().toString(36).substring(2),
        type: p.type,
        title: p.title || null,
        content: p.content || null,
        url: p.url || null,
        file_path: tempUrl,
        file_name: p.file_name || null,
        device_name: p.device_name || deviceName,
        is_pinned: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        preview_url: tempUrl,
      }, ...prev]);
      return;
    }
    let storagePath: string | null = null;
    let finalFileName = p.file_name || null;
    if (p.file) {
      const fileExt = finalFileName?.split('.').pop() || (p.type === 'audio' ? 'webm' : 'bin');
      finalFileName = finalFileName || `${Date.now()}.${fileExt}`;
      storagePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${finalFileName}`;
      const { error: uploadError } = await supabase.storage.from('stm-files').upload(storagePath, p.file, { upsert: false });
      if (uploadError) { showToast(`Upload failed: ${uploadError.message}`); return; }
    }
    const payload = {
      user_id: user.id,
      type: p.type,
      title: p.title || null,
      content: p.content || null,
      url: p.url || null,
      file_path: storagePath,
      file_name: finalFileName,
      device_name: p.device_name || deviceName,
      is_pinned: false,
      is_archived: false,
    };
    const { error } = await supabase.from('stm_inbox_items').insert(payload);
    if (error) { showToast(`Save failed: ${error.message}`); return; }
    await loadInbox(user);
  };

  const handleCopy = async (text: string, type: 'text'|'image', isReCopy = false) => {
    await copyToClipboard(text);
    if (!user && !isReCopy) {
      setClipboardHistory((prev) => {
        if (prev.length > 0 && prev[0].content === text) return prev;
        return [{
          id: Math.random().toString(36).substring(2),
          type,
          content: text,
          snippet: type === 'image' ? 'Image URL' : text.substring(0, 80),
          copied_at: Date.now(),
        }, ...prev].slice(0, 20);
      });
    } else if (user && !isReCopy) {
      const snippet = type === 'image' ? 'Image URL' : text.substring(0, 80);
      await supabase.from('stm_clipboard_history').insert({
        user_id: user.id,
        type,
        content: text,
        snippet,
        copied_at: new Date().toISOString(),
      });
      const { data: rows } = await supabase.from('stm_clipboard_history').select('id').eq('user_id', user.id).order('copied_at', { ascending: false });
      const oldIds = (rows || []).slice(20).map((r: any) => r.id);
      if (oldIds.length > 0) await supabase.from('stm_clipboard_history').delete().in('id', oldIds);
      await loadClipboardHistory(user);
    }
    const id = Date.now();
    setToast({ id, msg: type === 'image' ? 'Image URL copied!' : 'Copied!' });
    clearToastLater(id);
    setIsModalOpen(false);
  };
  const deleteHistoryItem = (id: string) => {
    if (user) supabase.from('stm_clipboard_history').delete().eq('id', id).then(() => loadClipboardHistory(user));
    setClipboardHistory(prev => prev.filter((item) => item.id !== id));
    setSwipedHistoryId(null);
    showToast('History item deleted');
  };

  const updateItem = async (id: string, updates: Partial<InboxItem>) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, ...updates } : i));
    if (user) {
      const { error } = await supabase.from('stm_inbox_items').update({
        content: updates.content,
        is_pinned: updates.is_pinned,
        is_archived: updates.is_archived,
      }).eq('id', id).eq('user_id', user.id);
      if (error) showToast(`Update failed: ${error.message}`);
    }
  };

  const filteredItems = useMemo(() => items.filter(item => {
    if (item.is_archived !== viewArchived) return false;
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = (item.title?.toLowerCase().includes(q) || item.content?.toLowerCase().includes(q) || item.url?.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  }).sort((a,b) => (a.is_pinned===b.is_pinned ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() : a.is_pinned?-1:1)),
  [items, viewArchived, typeFilter, searchQuery]);

  return (
    <div className="app-wrapper" data-theme={theme}>
      <style>{globalStyles}</style>

        <header style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)', padding: '12px 0', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'var(--glass-blur)' }}>
          <div className="container space-between">
            <div className="row" style={{ gap: 8, color: 'var(--accent)', fontWeight: 'bold' }}><Icons.Send /> Send to Me</div>
            <div className="row">
              {!user && !authLoading && (
                <>
                  <span className="badge muted" style={{ background: 'transparent', border: '1px solid var(--border)', padding: '8px 10px' }}>Not signed in</span>
                  <input className="input" style={{ width: 220, padding: '8px 10px' }} value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="Email" />
                  <input className="input" style={{ width: 180, padding: '8px 10px' }} type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Password" />
                  <button
                    className="btn secondary small"
                    onClick={async () => {
                      if (!authEmail.trim() || !authPassword.trim()) { showToast('Enter email and password'); return; }
                      const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
                      showToast(error ? error.message : 'Signed in');
                    }}
                  >
                    Sign In
                  </button>
                </>
              )}
              {user && (
                <>
                  <span className="badge muted" style={{ background: 'transparent', border: '1px solid var(--border)', padding: '8px 10px' }}>{user.email}</span>
                  <button className="btn secondary small" onClick={async () => { await supabase.auth.signOut(); }}>Sign Out</button>
                </>
              )}
              <button className="btn secondary" onClick={() => setIsModalOpen(true)} style={{ padding: '8px 12px' }}><Icons.Clipboard /> <span style={{fontSize: 14}}>History {clipboardHistory.length > 0 && `(${clipboardHistory.length})`}</span></button>
              <button className="btn secondary icon-only" onClick={toggleTheme} style={{ borderRadius: '50%' }}>{theme === 'dark' ? <Icons.Sun /> : <Icons.Moon />}</button>
            </div>
          </div>
        </header>

        <main className="container" style={{ padding: '32px 0 64px' }}>
          <div className="grid" style={{ gridTemplateColumns: 'minmax(380px, 1fr) minmax(420px, 2fr)', gap: 24 }}>

            {/* LEFT COLUMN: Composer */}
            <div style={{ position: 'sticky', top: 88, height: 'max-content' }}>
              <Composer deviceName={deviceName} onAddItem={addItem} onTriggerPaste={async () => {
                try {
                  const text = await navigator.clipboard.readText(); const t = /^https?:\/\//i.test(text) ? 'link' : 'note';
                  await addItem({ type: t, content: text, url: t === 'link' ? text : null, device_name: deviceName }); showToast('Pasted to Inbox!');
                } catch { alert('Browser blocked auto-paste.'); }
              }} />
            </div>

            {/* RIGHT COLUMN: Inbox List */}
            <div className="card" style={{ padding: 24 }}>
              <div className="responsive-stack" style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: '20px', whiteSpace: 'nowrap' }}>
                  {viewArchived ? 'Archive' : 'Inbox'} ({filteredItems.length})
                </h2>

                {/* Filters Row */}
                <div className="row" style={{ flex: 1, justifyContent: 'flex-end', width: '100%' }}>
                  <div className="search-wrapper">
                    <Icons.Search />
                    <input className="input" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ padding: '8px 12px 8px 40px' }} />
                  </div>
                  <select className="select" style={{ width: 'auto', padding: '8px 12px' }} value={typeFilter} onChange={(e: any) => setTypeFilter(e.target.value)}>
                    <option value="all">All Types</option><option value="note">Notes</option><option value="link">Links</option>
                    <option value="file">Files</option><option value="image">Images</option><option value="audio">Audio</option>
                  </select>
                  <button className={`btn small ${viewArchived ? '' : 'secondary'}`} onClick={() => setViewArchived(!viewArchived)} title="Toggle Archive">
                    <Icons.Archive />
                  </button>
                </div>
              </div>

              <div className="grid">
                {filteredItems.length === 0 && <div className="muted" style={{textAlign: 'center', padding: '32px 0'}}>No items match your filters.</div>}
                {filteredItems.map((item, idx) => (
                  <div key={item.id} className="card item-card" style={{ padding: 20, background: 'var(--panel-solid)', animationDelay: (idx * 0.05) + 's', display: 'flex', flexDirection: 'column' }}>

                    <div className="row" style={{ marginBottom: 12 }}>
                      <span className="badge" style={{ textTransform: 'capitalize' }}>
                        {item.type === 'note' && <Icons.Note />}{item.type === 'link' && <Icons.Link />}{item.type === 'file' && <Icons.File />}
                        {item.type === 'image' && <Icons.Image />}{item.type === 'audio' && <Icons.Mic />}{item.type}
                      </span>
                      {item.device_name && <span className="badge muted" style={{ background: 'transparent', border: 'none', padding: 0 }}>from {item.device_name}</span>}
                      {item.is_pinned && <span className="badge pinned"><Icons.Pin/> Pinned</span>}
                      {item.is_archived && <span className="badge archived"><Icons.Archive/> Archived</span>}
                    </div>

                    {item.title && <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>{item.title}</h3>}

                    {item.content && (
                      <div className="copy-action-wrapper">
                        <div className="copy-action-header">
                          <span className="muted" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Note</span>
                          <div className="row" style={{ gap: 8 }}>
                            <button className="btn small secondary" style={{ padding: '4px 8px' }} onClick={() => {
                              if (editingId === item.id) {
                                updateItem(item.id, { content: editContent });
                                setEditingId(null);
                                showToast('Saved!');
                              } else {
                                setEditingId(item.id);
                                setEditContent(item.content || '');
                              }
                            }}>
                              <Icons.Edit /> {editingId === item.id ? 'Save' : 'Edit'}
                            </button>
                            <button className="btn small secondary" style={{ padding: '4px 8px' }} onClick={() => handleCopy(item.content || '', 'text')}><Icons.Copy /> Copy</button>
                          </div>
                        </div>
                        {editingId === item.id ? (
                          <textarea
                            className="textarea"
                            style={{ border: 'none', borderRadius: 0, minHeight: 100, margin: 0, width: '100%', background: 'rgba(0,0,0,0.2)' }}
                            autoFocus
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                          />
                        ) : (
                          <p style={{ margin: 0, padding: 16, whiteSpace: 'pre-wrap', lineHeight: 1.6, background: 'rgba(0,0,0,0.1)' }}>{item.content}</p>
                        )}
                      </div>
                    )}

                    {item.url && (
                       <div className="copy-action-wrapper" style={{ marginTop: item.content ? 12 : 0 }}>
                        <div className="copy-action-header">
                          <span className="muted" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Link</span>
                          <button className="btn small secondary" style={{ padding: '4px 8px' }} onClick={() => handleCopy(item.url || '', 'text')}><Icons.Copy /> Copy</button>
                        </div>
                        <div style={{ padding: 16, background: 'rgba(0,0,0,0.1)' }}><a href={item.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{item.url}</a></div>
                      </div>
                    )}

                    {item.type === 'image' && item.file_path && (
                      <div className="copy-action-wrapper" style={{ marginTop: 12, position: 'relative' }}>
                        <button className="btn small secondary" style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }} onClick={async () => {
                          if (!item.file_path) return;
                          const { data } = await supabase.storage.from('stm-files').createSignedUrl(item.file_path, 60 * 60 * 24);
                          if (data?.signedUrl) handleCopy(data.signedUrl, 'image');
                        }}><Icons.Copy /> Copy URL</button>
                        <img src={item.preview_url || ''} alt="Preview" style={{ display: 'block', width: '100%', maxHeight: 300, objectFit: 'contain', background: '#08101d' }} />
                      </div>
                    )}

                    {item.type === 'audio' && item.file_path && (
                      <div style={{ marginTop: 12 }}><audio controls src={item.preview_url || ''} /></div>
                    )}

                    {item.type === 'file' && item.file_name && <p className="muted" style={{ margin: '8px 0 0' }}>📄 {item.file_name}</p>}

                    {/* Footer Actions */}
                    <div className="row action-row" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                      <div className="muted" style={{ fontSize: 12, flex: 1 }}>{new Date(item.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
                      <div className="row" style={{ gap: 8 }}>
                        <button className="btn secondary icon-only" onClick={() => updateItem(item.id, { is_pinned: !item.is_pinned })} title={item.is_pinned ? "Unpin" : "Pin"}><Icons.Pin /></button>
                        <button className="btn secondary icon-only" onClick={() => updateItem(item.id, { is_archived: !item.is_archived })} title={item.is_archived ? "Unarchive" : "Archive"}><Icons.Archive /></button>
                        <button className="btn danger icon-only" onClick={async () => {
                          if (!window.confirm('Delete item forever?')) return;
                          setItems((prev) => prev.filter((i) => i.id !== item.id));
                          if (user) {
                            await supabase.from('stm_inbox_items').delete().eq('id', item.id).eq('user_id', user.id);
                            if (item.file_path) await supabase.storage.from('stm-files').remove([item.file_path]);
                          }
                        }}><Icons.Trash /></button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

      {/* MODALS AND TOASTS */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="modal-content" style={{ background: 'var(--panel-solid)', border: '1px solid var(--border)', borderRadius: 24, width: 'min(600px, 100%)', maxHeight: '85vh', overflow: 'auto' }}>
            <div className="space-between" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--panel-solid)', zIndex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}><Icons.Clipboard /> Clipboard History</h2>
              <button className="btn secondary icon-only" onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'transparent' }}><Icons.X /></button>
            </div>
            <div style={{ padding: 12 }}>
              {clipboardHistory.length === 0 ? <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)' }}>History is empty.</div> : clipboardHistory.map(item => (
                <div key={item.id} className="history-row">
                  <div
                    className={`history-item space-between ${swipedHistoryId === item.id ? 'swiped' : ''}`}
                    style={{ padding: 16, cursor: 'pointer' }}
                    onClick={() => {
                      if (swipedHistoryId === item.id) { setSwipedHistoryId(null); return; }
                      handleCopy(item.content, item.type, true);
                    }}
                    onTouchStart={(e) => {
                      touchStartXRef.current = e.changedTouches[0].clientX;
                      touchDeltaXRef.current = 0;
                    }}
                    onTouchMove={(e) => {
                      if (touchStartXRef.current === null) return;
                      touchDeltaXRef.current = e.changedTouches[0].clientX - touchStartXRef.current;
                      if (touchDeltaXRef.current < -30) setSwipedHistoryId(item.id);
                      if (touchDeltaXRef.current > 20 && swipedHistoryId === item.id) setSwipedHistoryId(null);
                    }}
                    onTouchEnd={() => {
                      if (touchDeltaXRef.current > -30) setSwipedHistoryId(null);
                      touchStartXRef.current = null;
                      touchDeltaXRef.current = 0;
                    }}
                  >
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>{item.type === 'image' ? <Icons.Image /> : <Icons.Note />} {new Date(item.copied_at).toLocaleTimeString()}</div>
                      <div style={{ color: 'var(--text)', fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.snippet}</div>
                    </div>
                    <button className="btn small secondary" style={{ flexShrink: 0 }}><Icons.Copy /> Re-Copy</button>
                  </div>
                  <button className="history-delete" onClick={() => deleteHistoryItem(item.id)}>Delete</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {toast && <div className="toast-container" style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, pointerEvents: 'none' }}><div style={{ background: 'var(--success)', color: '#000', padding: '12px 24px', borderRadius: 100, fontWeight: 600, display: 'flex', gap: 8, boxShadow: '0 8px 30px rgba(0,0,0,0.3)', animation: 'toastSlide 3s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}><Icons.Check /> {toast.msg}</div></div>}
    </div>
  );
}

export default function App() { return <ErrorBoundary><AppContent /></ErrorBoundary>; }
