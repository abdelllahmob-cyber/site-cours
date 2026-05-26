"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

function getDeviceId(): string {
  let id = localStorage.getItem("deviceId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("deviceId", id);
  }
  return id;
}

function getDeviceInfo(): string {
  return navigator.userAgent.slice(0, 200);
}

export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  // Check if already authenticated
  useEffect(() => {
    const deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
      setChecking(false);
      return;
    }
    fetch("/api/auth/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          router.replace("/lessons");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError("");

    const deviceId = getDeviceId();
    const deviceInfo = getDeviceInfo();

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), deviceId, deviceInfo }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem("authenticated", "true");
        router.push("/lessons");
      } else {
        const messages: Record<string, string> = {
          invalid_code: "الكود غير صحيح، حاول مرة أخرى",
          code_disabled: "هذا الكود معطل، تواصل مع المدرس",
          device_mismatch: "هذا الكود مسجل على جهاز آخر، تواصل مع المدرس",
          missing_fields: "أدخل الكود من فضلك",
        };
        setError(messages[data.error] ?? "حدث خطأ، حاول مرة أخرى");
      }
    } catch {
      setError("خطأ في الاتصال بالخادم، تحقق من الإنترنت");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">الكورس الإلكتروني</h1>
          <p className="text-slate-400 mt-2">أدخل الكود الخاص بك للوصول للدروس</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                كود الدخول
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="أدخل الكود هنا..."
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  text-center text-lg tracking-widest transition"
                autoComplete="off"
                spellCheck={false}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-900/40 border border-red-700/50 rounded-xl text-red-300 text-sm">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500
                text-white font-semibold rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري التحقق...
                </>
              ) : (
                "دخول"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          إذا واجهت مشكلة، تواصل مع المدرس
        </p>
      </div>
    </div>
  );
}
