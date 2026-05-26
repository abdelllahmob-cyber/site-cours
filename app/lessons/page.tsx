"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface CodeSnippet {
  label: string;
  content: string;
}

interface Lesson {
  id: string;
  title: string;
  bunny_url: string;
  code_content: string;
  lesson_order: number;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600
        text-slate-300 hover:text-white rounded-lg transition-colors"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-400">تم النسخ!</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          نسخ
        </>
      )}
    </button>
  );
}

export default function LessonsPage() {
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selected, setSelected] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const checkAuth = useCallback(async () => {
    const deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
      router.replace("/login");
      return null;
    }

    const res = await fetch("/api/auth/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId }),
    });
    const data = await res.json();
    if (!data.valid) {
      localStorage.removeItem("authenticated");
      router.replace("/login");
      return null;
    }
    return deviceId;
  }, [router]);

  useEffect(() => {
    async function load() {
      const deviceId = await checkAuth();
      if (!deviceId) return;

      const res = await fetch("/api/lessons", {
        headers: { "x-device-id": deviceId },
      });
      const data = await res.json();

      if (res.ok && data.lessons) {
        setLessons(data.lessons);
        if (data.lessons.length > 0) setSelected(data.lessons[0]);
      }
      setLoading(false);
    }
    load();
  }, [checkAuth]);

  function parseSnippets(raw: string): CodeSnippet[] {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return raw ? [{ label: "الكود", content: raw }] : [];
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400">جاري تحميل الدروس...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 right-0 z-30 w-72 bg-slate-800 border-l border-slate-700
          flex flex-col transform transition-transform duration-300 lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">قائمة الدروس</h2>
          <span className="text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded-full">
            {lessons.length} درس
          </span>
        </div>

        {/* Lesson List */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {lessons.map((lesson, i) => (
            <button
              key={lesson.id}
              onClick={() => { setSelected(lesson); setSidebarOpen(false); }}
              className={`w-full text-right px-4 py-3 rounded-xl transition-colors flex items-center gap-3
                ${selected?.id === lesson.id
                  ? "bg-indigo-600 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"}`}
            >
              <span className={`text-xs font-mono shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                ${selected?.id === lesson.id ? "bg-white/20" : "bg-slate-700"}`}>
                {i + 1}
              </span>
              <span className="text-sm leading-snug">{lesson.title}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-white font-semibold truncate">
              {selected?.title ?? "اختر درساً"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {selected && (
              <span className="hidden sm:inline text-xs text-slate-500">
                درس {lessons.findIndex(l => l.id === selected.id) + 1} من {lessons.length}
              </span>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 max-w-5xl w-full mx-auto">
          {selected ? (
            <>
              {/* Video Player */}
              <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
                <div className="aspect-video w-full">
                  <iframe
                    src={selected.bunny_url}
                    className="w-full h-full"
                    allowFullScreen
                    allow="autoplay; fullscreen"
                    style={{ border: "none" }}
                  />
                </div>
                <div className="px-5 py-4">
                  <h2 className="text-xl font-bold text-white">{selected.title}</h2>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-3 justify-between">
                {(() => {
                  const idx = lessons.findIndex(l => l.id === selected.id);
                  return (
                    <>
                      <button
                        onClick={() => idx < lessons.length - 1 && setSelected(lessons[idx + 1])}
                        disabled={idx >= lessons.length - 1}
                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed
                          text-slate-300 hover:text-white rounded-xl border border-slate-700 transition text-sm"
                      >
                        الدرس التالي ←
                      </button>
                      <button
                        onClick={() => idx > 0 && setSelected(lessons[idx - 1])}
                        disabled={idx <= 0}
                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed
                          text-slate-300 hover:text-white rounded-xl border border-slate-700 transition text-sm"
                      >
                        → الدرس السابق
                      </button>
                    </>
                  );
                })()}
              </div>

              {/* Code Snippets */}
              {(() => {
                const snippets = parseSnippets(selected.code_content);
                if (snippets.length === 0) return null;

                return (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      الأكواد والمرفقات
                    </h3>

                    {snippets.map((snippet, i) => (
                      <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700">
                          <span className="text-sm text-slate-300 font-mono">{snippet.label}</span>
                          <CopyButton text={snippet.content} />
                        </div>
                        <pre className="p-4 overflow-x-auto text-sm text-slate-300 leading-relaxed">
                          <code>{snippet.content}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center py-20 text-center">
              <div>
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-slate-500">اختر درساً من القائمة على اليمين</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
