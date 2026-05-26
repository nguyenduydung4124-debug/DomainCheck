import React, { useRef, useState, useMemo } from "react";
import { 
  FileJson, 
  FileText, 
  UploadCloud, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ShieldAlert, 
  Save, 
  Plus, 
  Lock, 
  Unlock, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Wand2
} from "lucide-react";
import { sampleCrawlerJson, sampleWhitelistText } from "../sampleData";
import { validateWhitelist, autoCleanAndFormatWhitelist, DomainWarning } from "../utils";
import { motion, AnimatePresence } from "motion/react";

interface InputAreaProps {
  jsonText: string;
  whitelistText: string;
  onJsonChange: (text: string) => void;
  onWhitelistChange: (text: string) => void;
  jsonError: string | null;
  parsedJsonCount: number;
  parsedWhitelistCount: number;
  smartMode: boolean;
  setSmartMode: (mode: boolean) => void;
  onReset: () => void;
  
  // Admin-related Props
  isAdmin: boolean;
  isConfigLocked: boolean;
  setIsConfigLocked: (locked: boolean) => void;
  onSaveAsDefault: () => void;

  jsonFileName?: string;
  whitelistFileName?: string;
  jsonSaveStatus?: "idle" | "saving" | "saved" | "error";
  whitelistSaveStatus?: "idle" | "saving" | "saved" | "error";
  onLinkJson?: () => void;
  onUnlinkJson?: () => void;
  onLinkWhitelist?: () => void;
  onUnlinkWhitelist?: () => void;
}

export default function InputArea({
  jsonText,
  whitelistText,
  onJsonChange,
  onWhitelistChange,
  jsonError,
  parsedJsonCount,
  parsedWhitelistCount,
  smartMode,
  setSmartMode,
  onReset,
  isAdmin,
  isConfigLocked,
  setIsConfigLocked,
  onSaveAsDefault,
  jsonFileName = "",
  whitelistFileName = "",
  jsonSaveStatus = "idle",
  whitelistSaveStatus = "idle",
  onLinkJson,
  onUnlinkJson,
  onLinkWhitelist,
  onUnlinkWhitelist
}: InputAreaProps) {
  const [isDragOverJson, setIsDragOverJson] = useState(false);
  const [isDragOverWhite, setIsDragOverWhite] = useState(false);
  const [sampleLoaded, setSampleLoaded] = useState(false);

  // Quick Rule configuration states for Admins
  const [quickDomain, setQuickDomain] = useState("");
  const [quickName, setQuickName] = useState("");
  const [quickSelectors, setQuickSelectors] = useState("");
  const [quickAddStatus, setQuickAddStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [showWarningsDetail, setShowWarningsDetail] = useState(false);
  const whitelistWarnings = useMemo(() => {
    return validateWhitelist(whitelistText, smartMode);
  }, [whitelistText, smartMode]);

  const handleCleanWhitelist = () => {
    const cleaned = autoCleanAndFormatWhitelist(whitelistText, smartMode);
    onWhitelistChange(cleaned);
  };

  const handleAddQuickRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (isConfigLocked && !isAdmin) {
      window.dispatchEvent(new CustomEvent("triggerAdminLogin", { 
        detail: { message: "Vui lòng đăng nhập quyền quản trị (Admin) để chèn nhanh CSS Rule!" } 
      }));
      return;
    }
    if (!quickDomain.trim()) {
      setQuickAddStatus({ type: "error", message: "Vui lòng nhập tên miền hợp lệ!" });
      return;
    }

    try {
      let currentArray: any[] = [];
      if (jsonText.trim()) {
        try {
          currentArray = JSON.parse(jsonText);
          if (!Array.isArray(currentArray)) {
            currentArray = [];
          }
        } catch (err) {
          setQuickAddStatus({ type: "error", message: "Định dạng JSON hiện tại đang lỗi, không thể chèn tự động!" });
          return;
        }
      }

      const selectorsArray = quickSelectors
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(s => ({ selector: s }));

      const normalizedDomain = quickDomain.trim().toLowerCase();

      const newRule: any = {
        domain: normalizedDomain,
        css_queries: selectorsArray,
      };

      if (quickName.trim()) {
        newRule.name = quickName.trim();
      }

      // Check if domain already exists to merge or replace
      const existIdx = currentArray.findIndex(
        item => item && typeof item.domain === "string" && item.domain.toLowerCase().replace(/https?:\/\//, "").replace(/www\./, "").replace(/\/$/, "") === normalizedDomain.replace(/https?:\/\//, "").replace(/www\./, "").replace(/\/$/, "")
      );

      if (existIdx !== -1) {
        const existingItem = currentArray[existIdx];
        let existingQueries = existingItem.css_queries;
        if (!existingQueries) {
          existingQueries = [];
        } else if (!Array.isArray(existingQueries)) {
          existingQueries = [existingQueries];
        }

        // Helper to convert queries to normalized strings for comparison
        const getSelectorStr = (q: any): string => {
          if (!q) return "";
          if (typeof q === "string") return q.trim().toLowerCase();
          const val = q.selector || q.query || q.css_query;
          if (typeof val === "string") return val.trim().toLowerCase();
          return JSON.stringify(q).trim().toLowerCase();
        };

        const existingSet = new Set(existingQueries.map(getSelectorStr));

        // Gộp thêm những CSS query mới chưa có vào danh sách cũ
        const mergedQueries = [...existingQueries];
        let addedCount = 0;

        for (const item of selectorsArray) {
          const rawSel = item.selector.trim().toLowerCase();
          if (rawSel && !existingSet.has(rawSel)) {
            mergedQueries.push(item);
            existingSet.add(rawSel);
            addedCount++;
          }
        }

        const updatedItem = {
          ...existingItem,
          css_queries: mergedQueries,
        };

        if (quickName.trim()) {
          updatedItem.name = quickName.trim();
        }

        currentArray[existIdx] = updatedItem;
        
        onJsonChange(JSON.stringify(currentArray, null, 2));
        setQuickDomain("");
        setQuickName("");
        setQuickSelectors("");
        setQuickAddStatus({ 
          type: "success", 
          message: `Đã cập nhật cấu hình cho ${normalizedDomain}! Thêm mới ${addedCount} selector (Tổng cộng: ${mergedQueries.length}).` 
        });
      } else {
        currentArray.push(newRule);
        onJsonChange(JSON.stringify(currentArray, null, 2));
        setQuickDomain("");
        setQuickName("");
        setQuickSelectors("");
        setQuickAddStatus({ type: "success", message: `Đã thêm thành công cấu hình cho ${normalizedDomain}!` });
      }

      setTimeout(() => setQuickAddStatus(null), 4000);
    } catch (err) {
      setQuickAddStatus({ type: "error", message: "Đã xảy ra lỗi khi tạo cấu hình mới!" });
    }
  };
  
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const whiteFileInputRef = useRef<HTMLInputElement>(null);

  // File Upload Handlers
  const handleJsonFileLoad = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === "string") {
        onJsonChange(e.target.result);
      }
    };
    reader.readAsText(file);
  };

  const handleWhiteFileLoad = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === "string") {
        onWhitelistChange(e.target.result);
      }
    };
    reader.readAsText(file);
  };

  // Drag-and-drop Events
  const handleDragOver = (e: React.DragEvent, setDragOver: (b: boolean) => void) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent, setDragOver: (b: boolean) => void) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (
    e: React.DragEvent,
    setDragOver: (b: boolean) => void,
    onLoad: (f: File) => void
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onLoad(e.dataTransfer.files[0]);
    }
  };

  const loadSampleData = () => {
    onJsonChange(JSON.stringify(sampleCrawlerJson, null, 2));
    onWhitelistChange(sampleWhitelistText);
    setSampleLoaded(true);
    setTimeout(() => setSampleLoaded(false), 3500);
  };

  return (
    <div className="space-y-5" id="input-section">
      {/* Configuration Settings Row */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-[0_2px_12px_rgba(0,0,0,0.015)] backdrop-blur-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-650 animate-pulse"></span>
          <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider font-sans">Tham số đối soát</span>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-4 w-full md:w-auto">
          {/* Smart Match Toggle Option */}
          <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-600 hover:text-slate-900 select-none transition-colors">
            <input
              type="checkbox"
              checked={smartMode}
              onChange={(e) => setSmartMode(e.target.checked)}
              className="rounded-lg border-slate-300 text-indigo-650 focus:ring-indigo-505 w-4 h-4 transition-all"
            />
            <span>Tìm kiếm thông minh <span className="text-[10px] text-slate-400 font-normal">(bỏ qua https://, www, /...)</span></span>
          </label>

          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <div className="relative inline-block">
              {/* Automated confirmation tooltip */}
              {sampleLoaded && (
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-white text-[10px] font-sans font-medium px-3 py-2 rounded-xl shadow-xl animate-bounce whitespace-nowrap z-50 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Đã nạp 5 domain crawler mẫu & whitelist thành công!</span>
                  {/* Tooltip arrow pointer */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
                </div>
              )}
              
              <button
                onClick={loadSampleData}
                id="btn-sample-data"
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  sampleLoaded
                    ? "text-white bg-emerald-600 shadow-md ring-4 ring-emerald-100 scale-95"
                    : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 active:scale-95 border border-emerald-250/20"
                }`}
              >
                {sampleLoaded ? (
                  <CheckCircle2 className="w-3.5 h-3.5 animate-pulse" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 hover:scale-110" />
                )}
                {sampleLoaded ? "Đã nạp dữ liệu mẫu" : "Sử dụng dữ liệu mẫu"}
              </button>
            </div>
            <button
              onClick={onReset}
              id="btn-reset-inputs"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-205 transition-all duration-200 cursor-pointer active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xóa trống tất cả
            </button>
          </div>
        </div>
      </div>

      {/* Admin Control Panel Overlay */}
      {isAdmin && (
        <div className="bg-amber-50/50 border border-amber-250/60 p-5 rounded-2xl space-y-4 shadow-[0_4px_12px_rgba(245,158,11,0.03)] animate-fade-in" id="admin-control-dashboard">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-amber-200/50">
            <div className="flex items-center gap-2.5">
              <span className="bg-amber-600 text-white p-1.5 rounded-xl">
                <ShieldAlert className="w-4.5 h-4.5" />
              </span>
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wide text-amber-900 font-sans flex items-center gap-1.5">
                  Quản trị viên: Chèn Quy tắc & Thiết lập Bảo mật
                </h4>
                <p className="text-[10px] text-amber-700/80 mt-0.5">
                  Phần cấu hình nhanh không cần viết trực tiếp mã JSON và có thể kích hoạt khóa bảo vệ tệp tin gốc.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Lock Configuration Toggle */}
              <button
                type="button"
                onClick={() => {
                  const val = !isConfigLocked;
                  setIsConfigLocked(val);
                  localStorage.setItem("domain_sentinel_config_locked", String(val));
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all cursor-pointer ${
                  isConfigLocked
                    ? "bg-amber-600 text-white border-amber-700 hover:bg-amber-700"
                    : "bg-slate-200 text-slate-600 border-slate-350 hover:bg-slate-300"
                }`}
              >
                {isConfigLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                {isConfigLocked ? "Đang khóa biên tập thô" : "Mở khóa biên tập thô"}
              </button>

              {/* Set Current as Save System Preset */}
              <button
                type="button"
                onClick={onSaveAsDefault}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest text-emerald-850 bg-emerald-50 border border-emerald-300/50 hover:bg-emerald-100 transition-colors cursor-pointer"
                title="Lưu tệp Crawler JSON hiện tại làm cơ sở mặc định ban đầu"
              >
                <Save className="w-3.5 h-3.5" />
                Lưu làm mặc định
              </button>
            </div>
          </div>

          {/* Programmatic automatic chèn quy tắc */}
          <form onSubmit={handleAddQuickRule} className="grid grid-cols-1 md:grid-cols-4 gap-3.5 items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-amber-900 uppercase tracking-widest block">Tên miền (Domain)</label>
              <input
                type="text"
                value={quickDomain}
                onChange={(e) => setQuickDomain(e.target.value)}
                disabled={isConfigLocked && !isAdmin}
                placeholder={isConfigLocked && !isAdmin ? "Chế độ bị khóa..." : "Ví dụ: tinhte.vn"}
                className={`w-full text-xs p-2.5 border rounded-xl outline-none transition-all font-mono transition-shadow shadow-3xs ${
                  isConfigLocked && !isAdmin
                    ? "bg-slate-100/60 text-slate-400 border-slate-150 cursor-not-allowed"
                    : "bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 text-slate-800"
                }`}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-amber-900 uppercase tracking-widest block">Tên báo/dịch vụ</label>
              <input
                type="text"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                disabled={isConfigLocked && !isAdmin}
                placeholder={isConfigLocked && !isAdmin ? "Chế độ bị khóa..." : "Ví dụ: Tinh Tế News"}
                className={`w-full text-xs p-2.5 border rounded-xl outline-none transition-all transition-shadow shadow-3xs ${
                  isConfigLocked && !isAdmin
                    ? "bg-slate-100/60 text-slate-400 border-slate-150 cursor-not-allowed"
                    : "bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 text-slate-850"
                }`}
              />
            </div>
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-[10px] font-extrabold text-amber-900 uppercase tracking-widest block">CSS Query (Phân tách dấu phẩy)</label>
              <input
                type="text"
                value={quickSelectors}
                onChange={(e) => setQuickSelectors(e.target.value)}
                disabled={isConfigLocked && !isAdmin}
                placeholder={isConfigLocked && !isAdmin ? "Chế độ bị khóa..." : "Ví dụ: h1, div.detail"}
                className={`w-full text-xs p-2.5 border rounded-xl outline-none transition-all font-mono transition-shadow shadow-3xs ${
                  isConfigLocked && !isAdmin
                    ? "bg-slate-100/60 text-slate-400 border-slate-150 cursor-not-allowed"
                    : "bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 text-slate-800"
                }`}
              />
            </div>
            <button
              type="submit"
              disabled={isConfigLocked && !isAdmin}
              className={`w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 text-[10px] font-black uppercase tracking-wider transition-all rounded-xl shadow-xs ${
                isConfigLocked && !isAdmin
                  ? "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                  : "text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer active:scale-98"
              }`}
            >
              <Plus className="w-4 h-4" />
              Chèn nhanh Rule
            </button>
          </form>

          {quickAddStatus && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-2 rounded-xl text-[11px] font-medium flex items-center gap-2 ${
                quickAddStatus.type === "success" 
                  ? "bg-emerald-100 border border-emerald-200 text-emerald-800"
                  : "bg-rose-100 border border-rose-200 text-rose-800"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{quickAddStatus.message}</span>
            </motion.div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* PANEL 1: Crawler configuration file */}
        <div 
          className={`flex flex-col bg-white border rounded-2xl shadow-xs transition-all duration-300 overflow-hidden relative ${
            isDragOverJson 
              ? "border-indigo-550 ring-4 ring-indigo-50 bg-indigo-50/5" 
              : "border-slate-200/80 hover:border-slate-300"
          }`}
          onDragOver={(e) => {
            if (isConfigLocked && !isAdmin) return;
            handleDragOver(e, setIsDragOverJson);
          }}
          onDragLeave={(e) => handleDragLeave(e, setIsDragOverJson)}
          onDrop={(e) => {
            if (isConfigLocked && !isAdmin) return;
            handleDrop(e, setIsDragOverJson, handleJsonFileLoad);
          }}
          id="panel-crawler-json"
        >
          {/* Header Panel */}
          <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200/70 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                1. Crawler Config (JSON)
              </span>
              <span className="text-[10px] text-indigo-700 font-mono font-bold uppercase bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-lg">
                Array
              </span>
            </div>

            <div className="flex items-center gap-2">
              {jsonFileName ? (
                <div className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-3xs`}>
                    <span className={`w-1.5 h-1.5 rounded-full bg-emerald-600 ${jsonSaveStatus === "saving" ? "animate-ping" : "animate-pulse"}`}></span>
                    <span>{jsonSaveStatus === "saving" ? "Đang lưu..." : jsonSaveStatus === "saved" ? "Đã đồng bộ!" : `Liên kết: ${jsonFileName}`}</span>
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onUnlinkJson?.(); }} 
                      className="text-emerald-700 hover:text-rose-600 focus:outline-none ml-1 cursor-pointer font-black text-xs px-1 hover:bg-rose-50 rounded"
                      title="Hủy liên kết lưu tự động về máy"
                    >
                      ×
                    </button>
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (isConfigLocked && !isAdmin) {
                      window.dispatchEvent(new CustomEvent("triggerAdminLogin", { 
                        detail: { message: "Vui lòng đăng nhập quyền quản trị (Admin) để liên kết với cấu hình máy tính!" } 
                      }));
                    } else {
                      onLinkJson?.();
                    }
                  }}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-3xs border ${
                    isConfigLocked && !isAdmin
                      ? "text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed"
                      : "text-emerald-750 bg-emerald-50/50 border-emerald-250/50 hover:bg-emerald-50 hover:border-emerald-350"
                  }`}
                  title="Thay đổi trên web sẽ tự động ghi đè lên file của bạn trên máy tính (Không cần tải lại)"
                >
                  <Save className="w-3.5 h-3.5" />
                  Ghi trực tiếp Local File
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (isConfigLocked && !isAdmin) {
                    window.dispatchEvent(new CustomEvent("triggerAdminLogin", { 
                      detail: { message: "Vui lòng đăng nhập quyền quản trị (Admin) để thay thế tệp cấu hình Crawler!" } 
                    }));
                  } else {
                    jsonFileInputRef.current?.click();
                  }
                }}
                className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-3xs ${
                  isConfigLocked && !isAdmin
                    ? "text-slate-400 bg-slate-50 border border-slate-200 cursor-not-allowed"
                    : "text-slate-650 hover:text-slate-900 bg-white border border-slate-250 hover:bg-slate-50"
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Tải File
              </button>
            </div>
            <input
              type="file"
              ref={jsonFileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleJsonFileLoad(e.target.files[0]);
                }
              }}
              accept=".json,application/json"
              className="hidden"
            />
          </div>

          {/* Locked alert notice */}
          {isConfigLocked && !isAdmin && (
            <div className="mx-4 mt-4 p-3.5 bg-amber-500/5 border border-amber-500/15 rounded-xl flex items-start gap-2.5" id="json-locked-alert">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-900/90 leading-relaxed font-sans">
                <span className="font-extrabold">Hộp biên tập thô bị khóa.</span> Toàn bộ cấu hình hệ thống đã được khóa bảo mật. Hãy rà soát danh sách hoặc nhấn <strong className="text-indigo-650 hover:text-indigo-800 underline cursor-pointer font-extrabold" onClick={() => window.dispatchEvent(new CustomEvent('triggerAdminLogin'))}>Đăng nhập Admin</strong> để cấp quyền thay đổi.
              </div>
            </div>
          )}

          {/* Area Input logic */}
          <div className="p-4 flex-1 flex flex-col space-y-3 bg-slate-50/10">
            <div className="relative flex-1">
              <textarea
                value={jsonText}
                onChange={(e) => onJsonChange(e.target.value)}
                readOnly={isConfigLocked && !isAdmin}
                placeholder='Nhập định dạng mảng JSON các object tên miền cấu hình, ví dụ:
[
  {
    "domain": "vnexpress.net",
    "css_queries": ["h1.title-detail", "p.description"]
  }
]'
                className={`w-full min-h-[180px] lg:min-h-[240px] font-mono text-xs leading-relaxed p-3.5 border rounded-xl outline-none transition-all resize-y ${
                  isConfigLocked && !isAdmin
                    ? "bg-slate-100/60 text-slate-500 border-slate-150 cursor-not-allowed"
                    : "bg-slate-50/60 focus:bg-white text-slate-700 border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-300"
                }`}
                id="crawler-json-textarea"
                spellCheck="false"
              />

              <AnimatePresence>
                {isDragOverJson && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="absolute inset-0 bg-indigo-50/95 backdrop-blur-xs border-2 border-dashed border-indigo-500 rounded-xl flex flex-col items-center justify-center space-y-2.5 z-30"
                  >
                    <div className="p-3 bg-indigo-100/80 text-indigo-600 rounded-full animate-bounce">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <p className="text-xs font-black text-indigo-950 uppercase tracking-widest font-sans">
                      Thả tệp Crawler JSON
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono text-center px-6">
                      Thả để nạp cấu hình bộ thu nạp bài viết
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Validation Log Banner */}
            <div className="flex items-center justify-between text-xs pt-1 px-1">
              <div>
                {jsonText.trim() === "" ? (
                  <span className="text-slate-400">Chưa nhập dữ liệu</span>
                ) : jsonError ? (
                  <div className="flex items-center gap-1.5 text-rose-600 font-medium" id="json-error-banner">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="line-clamp-1">{jsonError}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-indigo-600 font-medium" id="json-success-banner">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-indigo-500" />
                    <span>JSON hợp lệ. Đã tìm thấy <strong>{parsedJsonCount}</strong> cấu hình tên miền.</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-mono font-medium">
                {jsonText.length.toLocaleString()} kí tự
              </span>
            </div>
          </div>
        </div>

        {/* PANEL 2: Whitelist of domains */}
        <div 
          className={`flex flex-col bg-white border rounded-2xl shadow-xs transition-all duration-300 overflow-hidden relative ${
            isDragOverWhite 
              ? "border-indigo-500 ring-4 ring-indigo-50 bg-indigo-50/5" 
              : "border-slate-200/80 hover:border-slate-300"
          }`}
          onDragOver={(e) => handleDragOver(e, setIsDragOverWhite)}
          onDragLeave={(e) => handleDragLeave(e, setIsDragOverWhite)}
          onDrop={(e) => handleDrop(e, setIsDragOverWhite, handleWhiteFileLoad)}
          id="panel-whitelist-domains"
        >
          {/* Header Panel */}
          <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200/70 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                2. Domain Whitelist (CSV/Text)
              </span>
              <span className="text-[10px] text-emerald-700 font-mono font-bold uppercase bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded-lg font-bold">
                Plain List
              </span>
            </div>

            <div className="flex items-center gap-2">
              {whitelistFileName ? (
                <div className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-3xs`}>
                    <span className={`w-1.5 h-1.5 rounded-full bg-emerald-600 ${whitelistSaveStatus === "saving" ? "animate-ping" : "animate-pulse"}`}></span>
                    <span>{whitelistSaveStatus === "saving" ? "Đang lưu..." : whitelistSaveStatus === "saved" ? "Đã đồng bộ!" : `Liên kết: ${whitelistFileName}`}</span>
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onUnlinkWhitelist?.(); }} 
                      className="text-emerald-705 hover:text-rose-600 focus:outline-none ml-1 cursor-pointer font-black text-xs px-1 hover:bg-rose-50 rounded"
                      title="Hủy liên kết lưu tự động về máy"
                    >
                      ×
                    </button>
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (isConfigLocked && !isAdmin) {
                      window.dispatchEvent(new CustomEvent("triggerAdminLogin", { 
                        detail: { message: "Vui lòng đăng nhập quyền quản trị (Admin) để liên kết với cấu hình Whitelist máy tính!" } 
                      }));
                    } else {
                      onLinkWhitelist?.();
                    }
                  }}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-3xs border ${
                    isConfigLocked && !isAdmin
                      ? "text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed"
                      : "text-emerald-750 bg-emerald-50/50 border-emerald-250/50 hover:bg-emerald-50 hover:border-emerald-350"
                  }`}
                  title="Thay đổi tên miền sẽ tự động ghi đè lên file của bạn trên máy tính"
                >
                  <Save className="w-3.5 h-3.5" />
                  Ghi trực tiếp Local File
                </button>
              )}

              <button
                type="button"
                onClick={() => whiteFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-650 hover:text-slate-900 bg-white border border-slate-250 hover:bg-slate-50 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-3xs"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Tải File
              </button>
            </div>
            <input
              type="file"
              ref={whiteFileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleWhiteFileLoad(e.target.files[0]);
                }
              }}
              accept=".txt,.csv,.log,text/plain,text/csv"
              className="hidden"
            />
          </div>

          {/* Input text logic */}
          <div className="p-4 flex-1 flex flex-col space-y-3 bg-slate-50/10">
            <div className="relative flex-1">
              <textarea
                value={whitelistText}
                onChange={(e) => onWhitelistChange(e.target.value)}
                placeholder="Nhập tên miền đối chiếu (mỗi miền một hàng), ví dụ:
vnexpress.net
vietnamnet.vn
dantri.com.vn
lazada.vn"
                className="w-full min-h-[180px] lg:min-h-[240px] font-mono text-xs leading-relaxed text-slate-700 bg-slate-50/60 focus:bg-white p-3.5 border border-slate-200 rounded-xl focus:border-slate-400 focus:ring-1 focus:ring-slate-300 outline-none transition-all resize-y"
                id="whitelist-textarea"
                spellCheck="false"
              />

              <AnimatePresence>
                {isDragOverWhite && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="absolute inset-0 bg-emerald-50/95 backdrop-blur-xs border-2 border-dashed border-emerald-500 rounded-xl flex flex-col items-center justify-center space-y-2.5 z-30"
                  >
                    <div className="p-3 bg-emerald-100/80 text-emerald-600 rounded-full animate-bounce">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <p className="text-xs font-black text-emerald-950 uppercase tracking-widest font-sans">
                      Thả tệp Whitelist CSV/TXT
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono text-center px-6">
                      Chuẩn hóa và lặp lọc các tên miền trùng
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Validation indicators */}
            <div className="flex items-center justify-between text-xs pt-1 px-1">
              <div>
                {whitelistText.trim() === "" ? (
                  <span className="text-slate-400">Chưa nhập dữ liệu</span>
                ) : (
                  <div className="flex items-center gap-1.5 text-indigo-600 font-medium" id="whitelist-success-banner">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-indigo-500" />
                    <span>Đã nạp thành công <strong>{parsedWhitelistCount}</strong> danh mục tên miền không trùng lặp.</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-mono font-medium">
                {whitelistText.split(/\r?\n/).filter(line => line.trim().length > 0).length.toLocaleString()} dòng
              </span>
            </div>

            {/* Domain Validator - Collapsible Diagnostic Alerts */}
            {whitelistText.trim() !== "" && whitelistWarnings.length > 0 && (
              <div className="mt-1.5 bg-amber-50/70 border border-amber-250/50 rounded-xl p-3 space-y-2 text-slate-800" id="whitelist-diagnostics-box">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-amber-900 font-bold">
                    <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                    <span>Hệ thống phát hiện <strong className="text-amber-700 font-extrabold">{whitelistWarnings.length}</strong> điểm dị thường trong định dạng Whitelist</span>
                  </div>
                  
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setShowWarningsDetail(!showWarningsDetail)}
                      className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-550 hover:text-slate-800 focus:outline-none transition-colors cursor-pointer"
                    >
                      <span>{showWarningsDetail ? "Rút gọn" : "Xem chi tiết"}</span>
                      {showWarningsDetail ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleCleanWhitelist}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10.5px] font-black uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-850 rounded-xl shadow-3xs cursor-pointer transition-all active:scale-97"
                      title="Hệ thống sẽ dọn các lỗi HTTP, WWW, email, cắt tỉa khoảng trống và thư mục con tự động!"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-amber-200" />
                      <span>Chuẩn hóa hết</span>
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {showWarningsDetail && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-[11px] font-mono select-text pt-2 border-t border-amber-200/50 max-w-full">
                        {whitelistWarnings.map((warn, wIdx) => (
                          <div key={wIdx} className="flex items-start gap-2 py-1.5 hover:bg-stone-100/40 rounded px-1.5 transition-all">
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono shrink-0 mt-0.5 ${
                              warn.severity === "error"
                                ? "bg-rose-50 text-rose-800 border border-rose-200"
                                : "bg-amber-100 text-amber-900 border border-amber-250/40"
                            }`}>
                              DÒNG {warn.lineNumber}
                            </span>
                            <div className="flex-1 min-w-0 font-sans">
                              <p className="font-mono text-[10.5px] text-slate-800 leading-relaxed font-bold break-all">
                                <span className="text-slate-400 font-normal">Đầu vào:</span> &quot;{warn.originalText}&quot;
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                                <strong className="text-amber-800 font-semibold">{warn.severity === "error" ? "Lỗi nghiêm trọng: " : "Khuyến nghị: "}</strong>
                                {warn.message} 
                                {warn.cleanDomain && (
                                  <span> Tên miền sau chuẩn hoá: <code className="font-mono bg-white px-1 border border-slate-200 text-slate-700 font-bold">{warn.cleanDomain}</code></span>
                                )}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
