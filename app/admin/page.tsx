"use client";
import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AccessCode {
  id: string;
  code: string;
  label: string;
  device_id: string | null;
  device_info: string;
  registered_at: string | null;
  last_seen: string | null;
  is_active: boolean;
  created_at: string;
}

interface Lesson {
  id: string;
  title: string;
  bunny_url: string;
  code_content: string;
  lesson_order: number;
}

interface CodeSnippet {
  label: string;
  content: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("ar-MA", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium
      ${active ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-green-400" : "bg-red-400"}`} />
      {active ? "مفعّل" : "معطّل"}
    </span>
  );
}

function DeviceStatus({ row }: { row: AccessCode }) {
  if (!row.device_id) {
    return <span className="text-xs text-slate-500 italic">غير مسجل</span>;
  }
  return (
    <div className="text-xs space-y-0.5">
      <div className="text-slate-300 truncate max-w-[200px]" title={row.device_info}>
        {row.device_info ? row.device_info.slice(0, 60) + "…" : "جهاز مجهول"}
      </div>
      <div className="text-slate-500">آخر ظهور: {fmt(row.last_seen)}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [tab, setTab] = useState<"devices" | "lessons">("devices");

  // ── Devices state ──
  const [devices, setDevices] = useState<AccessCode[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [addingCode, setAddingCode] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editLabel, setEditLabel] = useState("");

  // ── Lessons state ──
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    title: "", bunny_url: "", lesson_order: "",
  });
  const [snippets, setSnippets] = useState<CodeSnippet[]>([{ label: "", content: "" }]);
  const [savingLesson, setSavingLesson] = useState(false);
  const [lessonError, setLessonError] = useState("");
  const [editLessonId, setEditLessonId] = useState<string | null>(null);

  // ── Auth ──
  useEffect(() => {
    const saved = localStorage.getItem("adminToken");
    if (saved) setToken(saved);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (res.ok && data.token) {
      localStorage.setItem("adminToken", data.token);
      setToken(data.token);
    } else {
      setLoginError("كلمة السر غير صحيحة");
    }
    setLoginLoading(false);
  }

  function logout() {
    localStorage.removeItem("adminToken");
    setToken(null);
  }

  // ── Load Data ──
  const loadDevices = useCallback(async () => {
    if (!token) return;
    setDevicesLoading(true);
    const res = await fetch("/api/admin/devices", { headers: authHeaders(token) });
    const data = await res.json();
    if (res.ok) setDevices(data.devices ?? []);
    setDevicesLoading(false);
  }, [token]);

  const loadLessons = useCallback(async () => {
    if (!token) return;
    setLessonsLoading(true);
    const res = await fetch("/api/admin/lessons", { headers: authHeaders(token) });
    const data = await res.json();
    if (res.ok) setLessons(data.lessons ?? []);
    setLessonsLoading(false);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (tab === "devices") loadDevices();
    if (tab === "lessons") loadLessons();
  }, [token, tab, loadDevices, loadLessons]);

  // ── Device Actions ──
  async function addCode() {
    if (!newCode.trim() || !token) return;
    setAddingCode(true);
    setCodeError("");
    const res = await fetch("/api/admin/devices", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ code: newCode.trim(), label: newLabel.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewCode(""); setNewLabel("");
      loadDevices();
    } else {
      setCodeError(data.error === "code_exists" ? "هذا الكود موجود مسبقاً" : "حدث خطأ");
    }
    setAddingCode(false);
  }

  async function deviceAction(id: string, action: "kick" | "disable" | "enable") {
    if (!token) return;
    await fetch(`/api/admin/devices/${id}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ action }),
    });
    loadDevices();
  }

  async function deleteDevice(id: string) {
    if (!token || !confirm("هل أنت متأكد؟ هذا سيحذف الكود نهائياً.")) return;
    await fetch(`/api/admin/devices/${id}`, { method: "DELETE", headers: authHeaders(token) });
    loadDevices();
  }

  async function saveEditCode() {
    if (!editId || !token) return;
    await fetch(`/api/admin/devices/${editId}`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify({ code: editCode.trim(), label: editLabel }),
    });
    setEditId(null);
    loadDevices();
  }

  // ── Lesson Actions ──
  function resetLessonForm() {
    setLessonForm({ title: "", bunny_url: "", lesson_order: "" });
    setSnippets([{ label: "", content: "" }]);
    setEditLessonId(null);
    setLessonError("");
  }

  function startEditLesson(lesson: Lesson) {
    setEditLessonId(lesson.id);
    setLessonForm({
      title: lesson.title,
      bunny_url: lesson.bunny_url,
      lesson_order: String(lesson.lesson_order),
    });
    try {
      const parsed = JSON.parse(lesson.code_content);
      setSnippets(Array.isArray(parsed) && parsed.length > 0 ? parsed : [{ label: "", content: "" }]);
    } catch {
      setSnippets([{ label: "الكود", content: lesson.code_content }]);
    }
    setTab("lessons");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveLesson() {
    if (!token || !lessonForm.title.trim() || !lessonForm.bunny_url.trim()) {
      setLessonError("العنوان ورابط الفيديو مطلوبان");
      return;
    }
    setSavingLesson(true);
    setLessonError("");

    const validSnippets = snippets.filter(s => s.content.trim());
    const payload = {
      title: lessonForm.title.trim(),
      bunny_url: lessonForm.bunny_url.trim(),
      code_content: JSON.stringify(validSnippets),
      lesson_order: lessonForm.lesson_order ? parseInt(lessonForm.lesson_order) : undefined,
    };

    const url = editLessonId ? `/api/admin/lessons/${editLessonId}` : "/api/admin/lessons";
    const method = editLessonId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      resetLessonForm();
      loadLessons();
    } else {
      setLessonError("حدث خطأ في الحفظ");
    }
    setSavingLesson(false);
  }

  async function deleteLesson(id: string) {
    if (!token || !confirm("هل أنت متأكد؟ سيتم حذف هذا الدرس نهائياً.")) return;
    await fetch(`/api/admin/lessons/${id}`, { method: "DELETE", headers: authHeaders(token) });
    loadLessons();
  }

  // ─── Login Screen ─────────────────────────────────────────────────────────

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-600 rounded-2xl mb-4">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">لوحة التحكم</h1>
            <p className="text-slate-400 text-sm mt-1">للمدرس فقط</p>
          </div>

          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-7 shadow-2xl">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">كلمة السر</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="أدخل كلمة السر..."
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white
                    placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                  autoComplete="current-password"
                />
              </div>
              {loginError && (
                <p className="text-red-400 text-sm bg-red-900/30 px-3 py-2 rounded-lg">{loginError}</p>
              )}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-60
                  text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                {loginLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : "دخول"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-white">لوحة التحكم</h1>
        </div>
        <button
          onClick={logout}
          className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition"
        >
          خروج
        </button>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800 rounded-xl p-1 w-fit border border-slate-700">
          {(["devices", "lessons"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition
                ${tab === t ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              {t === "devices" ? "الأكواد والأجهزة" : "الدروس"}
            </button>
          ))}
        </div>

        {/* ══════════ DEVICES TAB ══════════ */}
        {tab === "devices" && (
          <div className="space-y-6">
            {/* Add Code Form */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
              <h2 className="text-base font-semibold text-white mb-4">إضافة كود جديد</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={newCode}
                  onChange={e => setNewCode(e.target.value)}
                  placeholder="الكود (مثال: STUDENT003)"
                  className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-white
                    placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition"
                  onKeyDown={e => e.key === "Enter" && addCode()}
                />
                <input
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder="اسم الطالب (اختياري)"
                  className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-white
                    placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition"
                />
                <button
                  onClick={addCode}
                  disabled={addingCode || !newCode.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50
                    text-white rounded-xl text-sm font-medium transition shrink-0"
                >
                  {addingCode ? "جاري الإضافة..." : "+ إضافة"}
                </button>
              </div>
              {codeError && <p className="text-red-400 text-sm mt-2">{codeError}</p>}
            </div>

            {/* Devices Table */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                <h2 className="font-semibold text-white">الأكواد المسجلة</h2>
                <button
                  onClick={loadDevices}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700 transition"
                >
                  تحديث
                </button>
              </div>

              {devicesLoading ? (
                <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
              ) : devices.length === 0 ? (
                <div className="p-8 text-center text-slate-500">لا توجد أكواد بعد</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-right text-slate-400 border-b border-slate-700 text-xs">
                        <th className="px-4 py-3 font-medium">الكود</th>
                        <th className="px-4 py-3 font-medium">الطالب</th>
                        <th className="px-4 py-3 font-medium">الجهاز</th>
                        <th className="px-4 py-3 font-medium">الحالة</th>
                        <th className="px-4 py-3 font-medium">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {devices.map(row => (
                        <tr key={row.id} className="hover:bg-slate-700/30 transition">
                          <td className="px-4 py-3">
                            {editId === row.id ? (
                              <input
                                value={editCode}
                                onChange={e => setEditCode(e.target.value)}
                                className="w-32 px-2 py-1 bg-slate-900 border border-indigo-500 rounded text-white text-sm"
                              />
                            ) : (
                              <span className="font-mono text-indigo-300">{row.code}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {editId === row.id ? (
                              <input
                                value={editLabel}
                                onChange={e => setEditLabel(e.target.value)}
                                className="w-28 px-2 py-1 bg-slate-900 border border-indigo-500 rounded text-white text-sm"
                              />
                            ) : (
                              <span className="text-slate-300">{row.label || "—"}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <DeviceStatus row={row} />
                          </td>
                          <td className="px-4 py-3">
                            <Badge active={row.is_active} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {editId === row.id ? (
                                <>
                                  <button onClick={saveEditCode}
                                    className="px-2.5 py-1 bg-green-700 hover:bg-green-600 text-white rounded-lg text-xs transition">
                                    حفظ
                                  </button>
                                  <button onClick={() => setEditId(null)}
                                    className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs transition">
                                    إلغاء
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => { setEditId(row.id); setEditCode(row.code); setEditLabel(row.label); }}
                                    className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs transition">
                                    تعديل
                                  </button>
                                  {row.device_id && (
                                    <button onClick={() => deviceAction(row.id, "kick")}
                                      className="px-2.5 py-1 bg-orange-900/60 hover:bg-orange-800 text-orange-300 rounded-lg text-xs transition">
                                      طرد الجهاز
                                    </button>
                                  )}
                                  <button
                                    onClick={() => deviceAction(row.id, row.is_active ? "disable" : "enable")}
                                    className={`px-2.5 py-1 rounded-lg text-xs transition
                                      ${row.is_active
                                        ? "bg-yellow-900/60 hover:bg-yellow-800 text-yellow-300"
                                        : "bg-green-900/60 hover:bg-green-800 text-green-300"}`}>
                                    {row.is_active ? "تعطيل" : "تفعيل"}
                                  </button>
                                  <button onClick={() => deleteDevice(row.id)}
                                    className="px-2.5 py-1 bg-red-900/60 hover:bg-red-800 text-red-300 rounded-lg text-xs transition">
                                    حذف
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════ LESSONS TAB ══════════ */}
        {tab === "lessons" && (
          <div className="space-y-6">
            {/* Add/Edit Lesson Form */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
              <h2 className="text-base font-semibold text-white mb-5">
                {editLessonId ? "تعديل الدرس" : "إضافة درس جديد"}
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">عنوان الدرس *</label>
                    <input
                      value={lessonForm.title}
                      onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })}
                      placeholder="مثال: الدرس 3 - المتغيرات"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-white
                        placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">الترتيب (رقم)</label>
                    <input
                      type="number"
                      value={lessonForm.lesson_order}
                      onChange={e => setLessonForm({ ...lessonForm, lesson_order: e.target.value })}
                      placeholder="تلقائي"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-white
                        placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">رابط فيديو Bunny.net *</label>
                  <input
                    value={lessonForm.bunny_url}
                    onChange={e => setLessonForm({ ...lessonForm, bunny_url: e.target.value })}
                    placeholder="https://iframe.mediadelivery.net/embed/LIBRARY_ID/VIDEO_ID"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-white
                      placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition"
                    dir="ltr"
                  />
                </div>

                {/* Code Snippets */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-slate-400">الأكواد (اختياري)</label>
                    <button
                      onClick={() => setSnippets([...snippets, { label: "", content: "" }])}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                    >
                      + إضافة كود
                    </button>
                  </div>

                  <div className="space-y-3">
                    {snippets.map((s, i) => (
                      <div key={i} className="bg-slate-900 rounded-xl p-4 border border-slate-700 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            value={s.label}
                            onChange={e => {
                              const n = [...snippets]; n[i] = { ...n[i], label: e.target.value };
                              setSnippets(n);
                            }}
                            placeholder="اسم الملف (مثال: index.js)"
                            className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white
                              placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          {snippets.length > 1 && (
                            <button
                              onClick={() => setSnippets(snippets.filter((_, j) => j !== i))}
                              className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-900/30 transition"
                            >
                              حذف
                            </button>
                          )}
                        </div>
                        <textarea
                          value={s.content}
                          onChange={e => {
                            const n = [...snippets]; n[i] = { ...n[i], content: e.target.value };
                            setSnippets(n);
                          }}
                          placeholder="الكود هنا..."
                          rows={5}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-300
                            placeholder-slate-600 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono resize-y"
                          dir="ltr"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {lessonError && (
                  <p className="text-red-400 text-sm bg-red-900/30 px-3 py-2 rounded-lg">{lessonError}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={saveLesson}
                    disabled={savingLesson}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60
                      text-white rounded-xl text-sm font-medium transition"
                  >
                    {savingLesson ? "جاري الحفظ..." : editLessonId ? "تحديث الدرس" : "حفظ الدرس"}
                  </button>
                  {editLessonId && (
                    <button
                      onClick={resetLessonForm}
                      className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm transition"
                    >
                      إلغاء التعديل
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Lessons List */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                <h2 className="font-semibold text-white">الدروس المضافة ({lessons.length})</h2>
                <button
                  onClick={loadLessons}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700 transition"
                >
                  تحديث
                </button>
              </div>

              {lessonsLoading ? (
                <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
              ) : lessons.length === 0 ? (
                <div className="p-8 text-center text-slate-500">لم تضف أي درس بعد</div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {lessons.map((lesson, i) => (
                    <div key={lesson.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-700/30 transition">
                      <span className="text-2xl font-bold text-slate-600 w-8 shrink-0 text-center">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium">{lesson.title}</p>
                        <p className="text-slate-500 text-xs mt-0.5 truncate" dir="ltr">{lesson.bunny_url}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => startEditLesson(lesson)}
                          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs transition"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => deleteLesson(lesson.id)}
                          className="px-3 py-1.5 bg-red-900/50 hover:bg-red-800 text-red-300 rounded-lg text-xs transition"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
