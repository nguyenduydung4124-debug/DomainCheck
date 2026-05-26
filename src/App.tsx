/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import BannerHeader from "./components/BannerHeader";
import InputArea from "./components/InputArea";
import StatsDashboard from "./components/StatsDashboard";
import ResultDetails from "./components/ResultDetails";

import { Key, ShieldCheck, CheckCircle2, AlertCircle, X, ShieldAlert, Info, Eye, EyeOff, Sparkles, LogOut, FileSpreadsheet } from "lucide-react";
import { parseCrawlerJson, parseWhitelist, performMatching, getDuplicateDomains, normalizeDomain } from "./utils";
import { sampleCrawlerJson, sampleWhitelistText } from "./sampleData";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // Initialize with custom system default from localStorage first if saved by an Admin, fallback to sample crawler JSON
  const [jsonText, setJsonText] = useState<string>(() => {
    const custom = localStorage.getItem("domain_sentinel_custom_crawler_json");
    if (custom) return custom;
    return JSON.stringify(sampleCrawlerJson, null, 2);
  });
  const [whitelistText, setWhitelistText] = useState<string>(() => 
    sampleWhitelistText
  );
  
  const [smartMode, setSmartMode] = useState<boolean>(true);

  // Admin Authentication states - session-based for strict browser-closing security
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return sessionStorage.getItem("domain_sentinel_is_admin") === "true";
  });
  
  const [isConfigLocked, setIsConfigLocked] = useState<boolean>(() => {
    return localStorage.getItem("domain_sentinel_config_locked") !== "false";
  });

  // Local File System auto-save states
  const [jsonFileHandle, setJsonFileHandle] = useState<any | null>(null);
  const [whitelistFileHandle, setWhitelistFileHandle] = useState<any | null>(null);
  const [jsonFileName, setJsonFileName] = useState<string>("");
  const [whitelistFileName, setWhitelistFileName] = useState<string>("");
  const [jsonSaveStatus, setJsonSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [whitelistSaveStatus, setWhitelistSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginAlertMessage, setLoginAlertMessage] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "info"; text: string } | null>(null);

  // Link Local JSON file handler
  const handleLinkJsonFile = async () => {
    if (typeof (window as any).showOpenFilePicker !== "function") {
      setToastMessage({ 
        type: "info", 
        text: "Trình duyệt của bạn không hỗ trợ ghi File trực tiếp (File System Access API). Vui lòng dùng Chrome, Edge hoặc Opera!" 
      });
      setTimeout(() => setToastMessage(null), 5000);
      return;
    }
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: "Crawler JSON Config Files",
            accept: {
              "application/json": [".json"]
            }
          }
        ],
        multiple: false
      });
      setJsonFileHandle(handle);
      setJsonFileName(handle.name);
      
      const file = await handle.getFile();
      const text = await file.text();
      setJsonText(text);
      
      setToastMessage({ type: "success", text: `Đã liên kết thành công file: ${handle.name}. Từ nay, mọi chỉnh sửa thô hoặc chèn rule tại chỗ sẽ tự động đồng bộ vào file này.` });
      setTimeout(() => setToastMessage(null), 6000);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Link JSON Error:", err);
        const inIframe = window.self !== window.top;
        const errMsg = inIframe 
          ? "Trình duyệt chặn mở file trực tiếp từ Khung xem trước (iFrame). Vui lòng nhấn biểu tượng Mở tab mới ở góc trên bên phải để sử dụng tính năng ghi đè tự động này!"
          : `Không thể mở file hoặc cấp quyền ghi: ${err.message || err.name || "Unknown error"}`;
        setToastMessage({ type: "info", text: errMsg });
        setTimeout(() => setToastMessage(null), 10000);
      }
    }
  };

  const handleUnlinkJsonFile = () => {
    setJsonFileHandle(null);
    setJsonFileName("");
    setJsonSaveStatus("idle");
    setToastMessage({ type: "info", text: "Đã ngắt kết nối tự động lưu file Crawler JSON." });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Link Local Whitelist file handler
  const handleLinkWhitelistFile = async () => {
    if (typeof (window as any).showOpenFilePicker !== "function") {
      setToastMessage({ 
        type: "info", 
        text: "Trình duyệt của bạn không hỗ trợ ghi File trực tiếp (File System Access API). Vui lòng dùng Chrome, Edge hoặc Opera!" 
      });
      setTimeout(() => setToastMessage(null), 5000);
      return;
    }
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: "Whitelist Texts/CSV Files",
            accept: {
              "text/plain": [".txt", ".csv", ".log"]
            }
          }
        ],
        multiple: false
      });
      setWhitelistFileHandle(handle);
      setWhitelistFileName(handle.name);
      
      const file = await handle.getFile();
      const text = await file.text();
      setWhitelistText(text);
      
      setToastMessage({ type: "success", text: `Đã liên kết thành công file: ${handle.name}. Từ nay, danh mục này sẽ tự động lưu về PC của bạn.` });
      setTimeout(() => setToastMessage(null), 6000);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Link Whitelist Error:", err);
        const inIframe = window.self !== window.top;
        const errMsg = inIframe 
          ? "Trình duyệt chặn mở file trực tiếp từ Khung xem trước (iFrame). Vui lòng nhấn biểu tượng Mở tab mới ở góc trên bên phải để sử dụng tính năng ghi đè tự động này!"
          : `Không thể mở file hoặc cấp quyền ghi: ${err.message || err.name || "Unknown error"}`;
        setToastMessage({ type: "info", text: errMsg });
        setTimeout(() => setToastMessage(null), 10000);
      }
    }
  };

  const handleUnlinkWhitelistFile = () => {
    setWhitelistFileHandle(null);
    setWhitelistFileName("");
    setWhitelistSaveStatus("idle");
    setToastMessage({ type: "info", text: "Đã ngắt kết nối tự động lưu file Whitelist." });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Auto-save Crawler JSON code trigger
  useEffect(() => {
    if (!jsonFileHandle) return;

    setJsonSaveStatus("saving");
    const timeoutId = setTimeout(async () => {
      try {
        const writable = await jsonFileHandle.createWritable();
        await writable.write(jsonText);
        await writable.close();
        setJsonSaveStatus("saved");
        const statusTimeout = setTimeout(() => setJsonSaveStatus("idle"), 2000);
        return () => clearTimeout(statusTimeout);
      } catch (err: any) {
        console.error("Auto-save JSON failed:", err);
        setJsonSaveStatus("error");
        // Verify if it's permission error or cancelled
        setToastMessage({ type: "info", text: `Không thể ghi tự động vào file ${jsonFileName}. Hãy kiểm tra và cho phép trình duyệt ghi sửa local file.` });
        setTimeout(() => setToastMessage(null), 5000);
      }
    }, 1000); // 1s Debounce

    return () => clearTimeout(timeoutId);
  }, [jsonText, jsonFileHandle]);

  // Auto-save Whitelist code trigger
  useEffect(() => {
    if (!whitelistFileHandle) return;

    setWhitelistSaveStatus("saving");
    const timeoutId = setTimeout(async () => {
      try {
        const writable = await whitelistFileHandle.createWritable();
        await writable.write(whitelistText);
        await writable.close();
        setWhitelistSaveStatus("saved");
        const statusTimeout = setTimeout(() => setWhitelistSaveStatus("idle"), 2000);
        return () => clearTimeout(statusTimeout);
      } catch (err: any) {
        console.error("Auto-save Whitelist failed:", err);
        setWhitelistSaveStatus("error");
        setToastMessage({ type: "info", text: `Không thể ghi tự động vào file ${whitelistFileName}. Hãy cấp quyền ghi cho trình duyệt.` });
        setTimeout(() => setToastMessage(null), 5000);
      }
    }, 1000); // 1s Debounce

    return () => clearTimeout(timeoutId);
  }, [whitelistText, whitelistFileHandle]);

  // Security brute-force protection states
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    return Number(localStorage.getItem("domain_sentinel_failed_attempts") || 0);
  });
  const [lockoutTime, setLockoutTime] = useState<number>(() => {
    return Number(localStorage.getItem("domain_sentinel_lockout_time") || 0);
  });
  const [countdown, setCountdown] = useState<number>(0);

  // Countdown clock handling for lockout duration
  useEffect(() => {
    if (lockoutTime > 0) {
      const now = Date.now();
      if (now < lockoutTime) {
        setCountdown(Math.ceil((lockoutTime - now) / 1000));
        const interval = setInterval(() => {
          const currentNow = Date.now();
          if (currentNow >= lockoutTime) {
            setCountdown(0);
            setLockoutTime(0);
            localStorage.removeItem("domain_sentinel_lockout_time");
            setFailedAttempts(0);
            localStorage.setItem("domain_sentinel_failed_attempts", "0");
            setLoginError(null);
            clearInterval(interval);
          } else {
            setCountdown(Math.ceil((lockoutTime - currentNow) / 1000));
          }
        }, 1000);
        return () => clearInterval(interval);
      } else {
        setLockoutTime(0);
        localStorage.removeItem("domain_sentinel_lockout_time");
        setFailedAttempts(0);
        localStorage.setItem("domain_sentinel_failed_attempts", "0");
      }
    }
  }, [lockoutTime]);

  // Hook to handle external access triggers (e.g., clicking 'Tải file' while locked)
  useEffect(() => {
    const handleTriggerLogin = (e: Event) => {
      const customEvent = e as CustomEvent;
      setLoginAlertMessage(customEvent.detail?.message || "");
      setLoginError(null);
      setShowLoginModal(true);
    };
    window.addEventListener("triggerAdminLogin", handleTriggerLogin);
    return () => window.removeEventListener("triggerAdminLogin", handleTriggerLogin);
  }, []);

  // Parse JSON data reactively with useMemo
  const parsedJsonResult = useMemo(() => {
    return parseCrawlerJson(jsonText);
  }, [jsonText]);

  // Parse Whitelsit data reactively
  const parsedWhitelistItems = useMemo(() => {
    return parseWhitelist(whitelistText, smartMode);
  }, [whitelistText, smartMode]);

  // Find duplicate list
  const duplicateGroups = useMemo(() => {
    return getDuplicateDomains(whitelistText, smartMode);
  }, [whitelistText, smartMode]);

  // Check if we are displaying domains from crawler config because Whitelist is empty
  const isVirtualList = useMemo(() => {
    return parsedWhitelistItems.length === 0 && parsedJsonResult.items.length > 0;
  }, [parsedWhitelistItems, parsedJsonResult.items]);

  // Build match bindings
  const matchedWhitelist = useMemo(() => {
    if (parsedWhitelistItems.length === 0 && parsedJsonResult.items.length > 0) {
      return parsedJsonResult.items.map((item, index) => {
        const clean = normalizeDomain(item.domain, smartMode);
        return {
          id: `virtual-${index}-${Date.now()}`,
          originalText: item.domain || "N/A",
          cleanDomain: clean,
          isMatched: true,
          matchedItem: item
        };
      });
    }
    return performMatching(parsedWhitelistItems, parsedJsonResult.items, smartMode);
  }, [parsedWhitelistItems, parsedJsonResult.items, smartMode]);

  // Generate aggregate metrics
  const stats = useMemo(() => {
    if (parsedWhitelistItems.length === 0 && parsedJsonResult.items.length > 0) {
      return {
        totalWhitelist: 0,
        totalConfigured: parsedJsonResult.items.length,
        totalMissing: 0,
        totalCrawlerJson: parsedJsonResult.items.length
      };
    }
    const total = parsedWhitelistItems.length;
    const configured = matchedWhitelist.filter(item => item.isMatched).length;
    const missing = Math.max(0, total - configured);
    
    return {
      totalWhitelist: total,
      totalConfigured: configured,
      totalMissing: missing,
      totalCrawlerJson: parsedJsonResult.items.length
    };
  }, [parsedWhitelistItems, matchedWhitelist, parsedJsonResult.items]);

  const handleReset = () => {
    setJsonText("");
    setWhitelistText("");
  };

  // Save Current state as default starting setup
  const handleSaveAsDefault = () => {
    if (parsedJsonResult.error) {
      setToastMessage({ type: "info", text: "Lỗi lưu: Vui lòng sửa lỗi định dạng JSON trước khi lưu mặc định!" });
      return;
    }
    localStorage.setItem("domain_sentinel_custom_crawler_json", jsonText);
    setToastMessage({ type: "success", text: "Đã thiết lập tệp cấu hình Crawler này làm cấu hình gốc khi khởi động!" });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent attempt if currently blocked
    if (countdown > 0) {
      setLoginError(`Hệ thống đang tạm khóa. Vui lòng thử lại sau.`);
      return;
    }

    try {
      // 1. Convert the input password to a SHA-256 hash using the Web Crypto API
      const msgBuffer = new TextEncoder().encode(loginPassword);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      // 2. Strict verification using stored SHA-256 hash digest (never expose raw string in script)
      const ADMIN_HASH = "38737b173422028f39a1d93737ef2f4db8618aae4099c2a9069cad90d1f1ca0c";

      if (hashHex === ADMIN_HASH) {
        setIsAdmin(true);
        sessionStorage.setItem("domain_sentinel_is_admin", "true");
        setFailedAttempts(0);
        localStorage.removeItem("domain_sentinel_failed_attempts");
        localStorage.removeItem("domain_sentinel_lockout_time");
        setLoginError(null);
        setLoginPassword("");
        setShowLoginModal(false);
        setToastMessage({ type: "success", text: "Đăng nhập quyền Quản trị viên (Admin) thành công!" });
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        // Increment unsuccessful attempt count
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        localStorage.setItem("domain_sentinel_failed_attempts", String(nextAttempts));

        if (nextAttempts >= 5) {
          const lockDuration = 15 * 60 * 1000; // 15-minute lock duration
          const lockUntil = Date.now() + lockDuration;
          setLockoutTime(lockUntil);
          localStorage.setItem("domain_sentinel_lockout_time", String(lockUntil));
          setLoginError("Đăng nhập thất bại quá 5 lần! Hệ thống tự động khóa truy cập trong 15 phút.");
        } else {
          setLoginError(`Mật khẩu không chính xác. Bạn đã thử sai ${nextAttempts}/5 lần. Thử sai 5 lần sẽ khóa hệ thống 15 phút.`);
        }
      }
    } catch (err) {
      setLoginError("Không thể hoàn tất xác thực mật mã bảo mật. Vui lòng thử lại.");
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem("domain_sentinel_is_admin");
    setToastMessage({ type: "info", text: "Đã thoát chế độ Quản trị viên." });
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 bg-grid-pattern text-slate-950 flex flex-col pb-8 font-sans">
      
      {!isAdmin ? (
        /* DEDICATED FULL-SCREEN ADMIN SIGN-IN PAGE */
        <div className="min-h-screen bg-radial from-slate-900 via-slate-950 to-black flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
          {/* Subtle Modern Glow effects */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.15, scale: 1 }}
            transition={{ duration: 1.8, ease: "easeOut" }}
            className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-505 rounded-full blur-[100px] pointer-events-none"
          ></motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.08, scale: 1 }}
            transition={{ duration: 2.2, ease: "easeOut", delay: 0.2 }}
            className="absolute bottom-1/4 pb-20 w-80 h-80 bg-emerald-500 rounded-full blur-[120px] pointer-events-none"
          ></motion.div>

          {/* Secure abstract decorative line overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

          {/* Core Sign-In Card container */}
          <motion.div 
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 145, damping: 20 }}
            className="w-full max-w-md bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] relative z-10 backdrop-blur-md"
          >
            {/* Header / Brand section */}
            <div className="px-6 pt-9 pb-7 text-center bg-radial from-slate-900/60 to-slate-950/20 border-b border-slate-800/60">
              <motion.div 
                initial={{ rotate: -15, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="mx-auto w-14 h-14 bg-gradient-to-tr from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-400 mb-4 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
              >
                <Key className="w-6 h-6" />
              </motion.div>
              <h1 className="text-xl font-extrabold text-white uppercase tracking-wider font-sans flex items-center justify-center gap-2">
                Domain Sentinel
              </h1>
              <p className="text-[11px] text-slate-400 mt-1.5 uppercase tracking-wider font-mono">
                Crawler Config & Sentinel Audit System
              </p>
              
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1 text-[9px] font-mono text-slate-400 border border-slate-850">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>SECURE CRYPTO ACCESS GATEWAY</span>
              </div>
            </div>

            {/* Credential login form */}
            <form onSubmit={handleAdminLoginSubmit} className="p-6 md:p-8 space-y-5">
              
              {loginAlertMessage && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs leading-relaxed">
                  {loginAlertMessage}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Mật khẩu quản trị (Admin)
                  </label>
                </div>
                
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder={countdown > 0 ? "Bàn phím tạm khóa..." : "Nhập mật khẩu truy cập hệ thống"}
                    className="w-full text-sm py-3 pl-4 pr-11 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl outline-none text-white font-mono tracking-wide placeholder-slate-600 transition-all shadow-inner disabled:opacity-40 disabled:cursor-not-allowed"
                    autoFocus
                    required
                    disabled={countdown > 0}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-200 cursor-pointer focus:outline-none disabled:opacity-25"
                    title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    disabled={countdown > 0}
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 bg-rose-950/30 border border-rose-900/40 rounded-xl flex items-start gap-2.5 text-rose-200 text-xs leading-relaxed"
                >
                  <AlertCircle className="w-4 h-4 text-rose-505 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </motion.div>
              )}

              <motion.button
                whileHover={countdown > 0 ? {} : { scale: 1.012 }}
                whileTap={countdown > 0 ? {} : { scale: 0.985 }}
                type="submit"
                disabled={countdown > 0}
                className="w-full inline-flex items-center justify-center gap-2 py-3 text-xs font-extrabold uppercase tracking-widest text-slate-950 bg-amber-400 hover:bg-amber-300 active:bg-amber-400 transition-colors rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.2)] cursor-pointer font-sans disabled:bg-slate-800/80 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed border disabled:border-slate-800"
              >
                {countdown > 0 ? (
                  <>
                    <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
                    <span>Hệ thống bị khóa ({Math.floor(countdown / 60)}p {countdown % 60}s)</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Đăng nhập Sentinel</span>
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="text-[10px] uppercase font-mono text-slate-500 tracking-widest mt-8"
          >
            © 2026 SENTINEL SECURE AUDIT BLOCK. SYSTEM ONLINE.
          </motion.p>
        </div>
      ) : (
        /* RENDER HOMEPAGE (TRANG CHỦ CHỈ KHI ĐĂNG NHẬP THÀNH CÔNG) */
        <>
          {/* Visual Header Banner */}
          <BannerHeader 
            isAdmin={isAdmin} 
            onLoginClick={() => {
              // Not strictly needed anymore since they are logged in, but keep structure sound
              setIsAdmin(true);
            }}
            onLogoutClick={() => setShowLogoutConfirm(true)}
            isConfigLocked={isConfigLocked}
          />

          {/* Shared alert notification toasts */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div 
                id="app-notification-toast" 
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="fixed top-4 right-4 z-50 max-w-sm"
              >
                <div className={`p-3.5 rounded-xl border shadow-lg flex items-start gap-2.5 ${
                  toastMessage.type === "success"
                    ? "bg-emerald-50 border-emerald-250 text-emerald-900"
                    : "bg-slate-900 border-slate-950 text-slate-100"
                }`}>
                  {toastMessage.type === "success" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <Info className="w-5 h-5 text-indigo-400 shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-bold font-sans">Thông báo Hệ thống</p>
                    <p className="text-[11px] leading-relaxed opacity-90 mt-0.5">{toastMessage.text}</p>
                  </div>
                  <button onClick={() => setToastMessage(null)} className="ml-1 text-slate-400 hover:text-slate-200 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Logout Confirmation Modal */}
          <AnimatePresence>
            {showLogoutConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ type: "spring", duration: 0.3 }}
                  className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative p-6 space-y-5 text-center"
                >
                  <div className="mx-auto w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center text-rose-400">
                    <LogOut className="w-5 h-5" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                      Xác nhận đăng xuất?
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed px-2">
                      Bạn có chắc chắn muốn thoát khỏi chế độ Quản trị viên không? Mọi tùy chỉnh cấu hình chưa lưu có thể bị đóng băng.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowLogoutConfirm(false)}
                      className="w-full py-2.5 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700/80 rounded-xl transition-all cursor-pointer active:scale-97 text-center"
                    >
                      Bỏ qua
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLogoutConfirm(false);
                        handleAdminLogout();
                      }}
                      className="w-full py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-500 shadow-[0_4px_12px_rgba(225,29,72,0.25)] rounded-xl transition-all cursor-pointer active:scale-97 text-center"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Content Area */}
          <motion.main 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 space-y-5 mt-5"
          >
            
            {/* Dynamic statistics overview */}
            <StatsDashboard stats={stats} matchedWhitelist={matchedWhitelist} />

            {/* Primary input, reconciliation lists & audit utilities */}
            <div className="space-y-5">
              {/* Input fields grids for copy-paste & file uploading */}
              <InputArea 
                jsonText={jsonText}
                whitelistText={whitelistText}
                onJsonChange={setJsonText}
                onWhitelistChange={setWhitelistText}
                jsonError={parsedJsonResult.error}
                parsedJsonCount={parsedJsonResult.items.length}
                parsedWhitelistCount={parsedWhitelistItems.length}
                smartMode={smartMode}
                setSmartMode={setSmartMode}
                onReset={handleReset}
                
                isAdmin={isAdmin}
                isConfigLocked={isConfigLocked}
                setIsConfigLocked={setIsConfigLocked}
                onSaveAsDefault={handleSaveAsDefault}

                jsonFileName={jsonFileName}
                whitelistFileName={whitelistFileName}
                jsonSaveStatus={jsonSaveStatus}
                whitelistSaveStatus={whitelistSaveStatus}
                onLinkJson={handleLinkJsonFile}
                onUnlinkJson={handleUnlinkJsonFile}
                onLinkWhitelist={handleLinkWhitelistFile}
                onUnlinkWhitelist={handleUnlinkWhitelistFile}
              />

              {/* Reconciled table lists & tabs with quick copy/download utilities */}
              <ResultDetails 
                matchedWhitelist={matchedWhitelist} 
                duplicateGroups={duplicateGroups} 
                isVirtualList={isVirtualList}
                jsonText={jsonText}
                onUpdateJson={setJsonText}
                isAdmin={isAdmin}
                isConfigLocked={isConfigLocked}
              />
            </div>

          </motion.main>
        </>
      )}

    </div>
  );
}
