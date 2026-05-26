import { Globe, HelpCircle, Info, Sparkles, ShieldCheck, LogIn, LogOut, Lock } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface BannerHeaderProps {
  isAdmin: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  isConfigLocked: boolean;
}

export default function BannerHeader({ isAdmin, onLoginClick, onLogoutClick, isConfigLocked }: BannerHeaderProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white shadow-sm shrink-0" id="app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Globe className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight uppercase tracking-wider text-slate-100 font-sans flex items-center gap-2">
                Domain Sentinel
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[9px] font-mono font-bold text-amber-400">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    ADMIN MODE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.2 text-[9px] font-mono font-medium text-slate-300">
                    v2.4
                  </span>
                )}
              </h1>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">
                Crawler Configuration & Whitelist Matcher
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2.5">
            {isAdmin ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/45 border border-amber-800/50 rounded-md text-amber-300">
                <ShieldCheck className="w-3.5 h-3.5 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Quản Trị Viên</span>
              </div>
            ) : isConfigLocked ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/60 border border-slate-700/50 rounded-md text-slate-400" title="Chế độ phân quyền: Cấu hình Crawler chuẩn bị khóa đổi thô để tránh nhập nhầm">
                <Lock className="w-3 h-3" />
                <span className="text-[9px] font-mono uppercase tracking-wider">Cấu hình khóa</span>
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHelp(!showHelp)}
                id="btn-toggle-help"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider text-indigo-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {showHelp ? "Đóng hướng dẫn" : "Hướng dẫn dùng"}
              </button>

              {isAdmin ? (
                <button
                  onClick={onLogoutClick}
                  id="btn-admin-logout"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider text-rose-300 hover:text-white bg-rose-950/20 hover:bg-rose-900/40 border border-rose-800/40 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Đăng xuất Admin
                </button>
              ) : (
                <button
                  onClick={onLoginClick}
                  id="btn-admin-login"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider text-amber-300 hover:text-amber-100 bg-amber-950/20 hover:bg-amber-950/40 border border-amber-800/40 transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Đăng nhập Admin
                </button>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showHelp && (
            <motion.div
              id="help-panel"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="p-4.5 bg-slate-800 border border-slate-700 rounded-xl space-y-4 text-slate-300 overflow-hidden"
            >
              <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5 uppercase tracking-wider">
                <Info className="w-4 h-4 text-indigo-400" />
                Quy trình hoạt động & Định dạng đầu vào
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300">
                <div className="space-y-2">
                  <h4 className="font-bold text-indigo-300 uppercase tracking-wide">1. Cấu hình Crawler (JSON)</h4>
                  <p>
                    Dán hoặc tải tệp chứa mảng các thiết lập và selectors:
                  </p>
                  <pre className="bg-slate-950 text-slate-300 p-2.5 rounded border border-slate-800 text-[10px] leading-relaxed overflow-x-auto font-mono">
{`[
  {
    "domain": "vnexpress.net",
    "css_queries": ["h1.title", "article.body"]
  }
]`}
                  </pre>
                  <p className="text-[10px] text-slate-400 italic">
                    * Hệ thống chấp nhận giao thức (https://), subdomains (www), và tự động chuẩn hóa domain để khớp nối thông minh.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-indigo-300 uppercase tracking-wide">2. Danh sách Whitelist kiểm tra</h4>
                  <p>
                    Dán chuỗi hoặc kéo thả tệp văn bản/CSV chứa các tên miền whitelist cần rà soát.
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-300">
                    <li><strong>Cách 1:</strong> Mỗi dòng là một tên miền (Ví dụ: <code className="font-mono bg-slate-900 px-1 py-0.5 rounded text-indigo-300">google.com</code>).</li>
                    <li><strong>Cách 2:</strong> Bản Excel xuất định dạng CSV có chứa hoặc không chứa cột tiêu đề <code className="font-mono text-slate-300">domain</code>.</li>
                    <li>Tự động loại bỏ trùng lặp và làm sạch các khoảng trắng thừa.</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

