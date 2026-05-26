import { useState, useMemo } from "react";
import { 
  ShieldAlert, 
  ShieldCheck, 
  CheckSquare, 
  BarChart3, 
  ChevronDown, 
  ChevronUp, 
  PieChart, 
  TrendingUp, 
  Info,
  HelpCircle
} from "lucide-react";
import { MatchStats, WhitelistItem } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface StatsDashboardProps {
  stats: MatchStats;
  matchedWhitelist?: WhitelistItem[];
}

export default function StatsDashboard({ stats, matchedWhitelist = [] }: StatsDashboardProps) {
  const [showCharts, setShowCharts] = useState<boolean>(true);
  const [hoveredSegment, setHoveredSegment] = useState<"configured" | "missing" | null>(null);
  const [hoveredTld, setHoveredTld] = useState<string | null>(null);

  const matchRate = stats.totalWhitelist > 0
    ? Math.round((stats.totalConfigured / stats.totalWhitelist) * 100)
    : 0;

  const displayMatchRate = Math.min(matchRate, 100);

  // Format single digit with leading zero for high density design premium feel
  const formatNum = (num: number) => {
    return num < 10 && num >= 0 ? `0${num}` : String(num);
  };

  // Helper helper to dynamically extract TLD extensions (supporting .com.vn style double endings too)
  const getTldName = (domain: string): string => {
    if (!domain || domain === "N/A") return "Khác";
    const clean = domain.trim().toLowerCase();
    const parts = clean.split(".");
    if (parts.length < 2) return "Khác";
    
    const last = parts[parts.length - 1];
    const prev = parts[parts.length - 2];
    
    // Check known dual combinations for VN network
    if (["com", "edu", "net", "org", "gov"].includes(prev) && last === "vn") {
      return `.${prev}.vn`;
    }
    return `.${last}`;
  };

  // Calculate top TLD extensions dynamically from matchedWhitelist
  const tldData = useMemo(() => {
    if (!matchedWhitelist || matchedWhitelist.length === 0) {
      return [];
    }
    const tldCounts: Record<string, number> = {};
    matchedWhitelist.forEach(item => {
      const tld = getTldName(item.cleanDomain);
      tldCounts[tld] = (tldCounts[tld] || 0) + 1;
    });

    const entries = Object.entries(tldCounts).map(([tld, count]) => {
      const percentage = matchedWhitelist.length > 0 
        ? Math.round((count / matchedWhitelist.length) * 100) 
        : 0;
      return { tld, count, percentage };
    });

    // Sort by count descending
    return entries.sort((a, b) => b.count - a.count).slice(0, 5);
  }, [matchedWhitelist]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 18 } }
  };

  // Circular gauge constant coordinates
  const radius = 40;
  const circumference = 2 * Math.PI * radius; // ~251.3
  const configuredStrokeDash = circumference * (displayMatchRate / 100);
  const missingStrokeDash = circumference - configuredStrokeDash;

  return (
    <div className="space-y-4">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" 
        id="stats-dashboard"
      >
        
        {/* CARD 1: Tổng whitelist */}
        <motion.div 
          variants={cardVariants}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between relative overflow-hidden transition-all duration-300 glow-card-indigo group cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/30 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-100/40 transition-colors duration-300"></div>
          <div className="flex items-center justify-between z-10">
            <div className="space-y-1">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-sans">
                Domain Whitelist
              </p>
              <p className="text-3xl font-black text-slate-900 font-sans tracking-tight" id="stat-total-whitelist">
                {formatNum(stats.totalWhitelist)}
              </p>
            </div>
            <div className="p-3 bg-indigo-50/80 text-indigo-600 rounded-xl border border-indigo-150/40 group-hover:scale-110 transition-transform duration-300 shadow-3xs">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100/80 text-[10px] text-slate-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            <span>Tổng số tên miền cần theo dõi</span>
          </div>
        </motion.div>

        {/* CARD 2: Đã được cấu hình */}
        <motion.div 
          variants={cardVariants}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between relative overflow-hidden transition-all duration-300 glow-card-emerald group cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/30 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-150/40 transition-colors duration-300"></div>
          <div className="flex items-center justify-between z-10">
            <div className="space-y-1">
              <p className="text-[10px] font-extrabold text-emerald-600/90 uppercase tracking-wider font-sans">
                Configured Domains
              </p>
              <p className="text-3xl font-black text-emerald-600 font-sans tracking-tight" id="stat-total-configured">
                {formatNum(stats.totalConfigured)}
              </p>
            </div>
            <div className="p-3 bg-emerald-50/80 text-emerald-600 rounded-xl border border-emerald-150/40 group-hover:scale-110 transition-transform duration-300 shadow-3xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100/80 text-[10px] text-slate-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Tên miền khớp cấu hình JSON</span>
          </div>
        </motion.div>

        {/* CARD 3: Chưa có cấu hình */}
        <motion.div 
          variants={cardVariants}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between relative overflow-hidden transition-all duration-300 glow-card-rose group cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50/20 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-150/30 transition-colors duration-300"></div>
          <div className="flex items-center justify-between z-10">
            <div className="space-y-1">
              <p className="text-[10px] font-extrabold text-rose-500/90 uppercase tracking-wider font-sans">
                Missing Target Rule
              </p>
              <p className="text-3xl font-black text-rose-500 font-sans tracking-tight" id="stat-total-missing">
                {formatNum(stats.totalMissing)}
              </p>
            </div>
            <div className="p-3 bg-rose-50/80 text-rose-500 rounded-xl border border-rose-150/40 group-hover:scale-110 transition-transform duration-300 shadow-3xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100/80 text-[10px] text-slate-400 flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${stats.totalMissing > 0 ? "bg-rose-500 animate-pulse" : "bg-slate-350"}`}></span>
            <span>Cần bổ sung css_queries</span>
          </div>
        </motion.div>

        {/* CARD 4: Tỉ lệ bao phủ */}
        <motion.div 
          variants={cardVariants}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between overflow-hidden transition-all duration-300 hover:shadow-md group cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-50/20 transition-colors duration-300"></div>
          <div className="flex items-center justify-between z-10">
            <div className="space-y-1 w-full mr-2">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-sans">
                Rule Coverage
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-900 font-sans tracking-tight">
                  {displayMatchRate}%
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  ({stats.totalConfigured}/{stats.totalWhitelist})
                </span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-150/40 group-hover:scale-110 transition-transform duration-300 shadow-3xs shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${displayMatchRate}%` }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="h-full bg-slate-900 rounded-full"
              ></motion.div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* DETAILED INTERACTIVE ANALYTICS SECTION */}
      {matchedWhitelist.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.015)] select-none">
          {/* Section Header Toggle */}
          <button
            type="button"
            onClick={() => setShowCharts(!showCharts)}
            className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50/40 hover:bg-slate-50/95 transition-colors text-left outline-none cursor-pointer border-b border-slate-100"
          >
            <div className="flex items-center gap-2 text-slate-800">
              <PieChart className="w-4.5 h-4.5 text-indigo-600" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider font-sans">
                Báo cáo Đồ thị Trực quan (Interactive Analytics)
              </h3>
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold font-mono text-indigo-700 uppercase border border-indigo-150/20 shadow-3xs">
                Real-time
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-400 font-medium font-sans">
                {showCharts ? "Thu gọn đồ thị" : "Mở rộng đồ thị"}
              </span>
              {showCharts ? (
                <ChevronUp className="w-4.5 h-4.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-4.5 h-4.5 text-slate-400" />
              )}
            </div>
          </button>

          {/* Core Analytics Bento Grid */}
          <AnimatePresence>
            {showCharts && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-slate-100 bg-linear-to-b from-white to-slate-50/40">
                  
                  {/* CHARTS COLUMN A: Rule Coverage Donut Ring */}
                  <div className="bg-white border border-slate-150/80 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-6 shadow-3xs relative group">
                    <div className="flex-1 space-y-3.5 w-full">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-800 font-sans">
                            Độ phủ Cấu hình CSS
                          </h4>
                          <span className="relative">
                            <Info className="w-3.5 h-3.5 text-slate-350 cursor-help peer" />
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden peer-hover:block bg-slate-900 text-white text-[9px] px-2.5 py-1.5 rounded-lg shadow-xl font-normal w-44 leading-relaxed z-40 text-center">
                              Tỉ lệ % tên miền trong Whitelist đã có rules CSS selectors tương hợp khớp trong JSON.
                            </div>
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          Phân bổ chi tiết giữa các nhóm đã cấu hình (Configured) và chưa được cấu hình.
                        </p>
                      </div>

                      {/* Donut Legend Cards with hover callbacks */}
                      <div className="space-y-2 border-t border-slate-100 pt-3">
                        <div 
                          onMouseEnter={() => setHoveredSegment("configured")}
                          onMouseLeave={() => setHoveredSegment(null)}
                          className={`p-2 rounded-xl border flex items-center justify-between transition-all cursor-default ${
                            hoveredSegment === "configured"
                              ? "bg-emerald-50/50 border-emerald-200 shadow-3xs text-emerald-950 scale-101"
                              : "bg-slate-50/30 border-slate-150/40 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                            <span className="text-[11px] font-semibold">Đã có bộ Selectors</span>
                          </div>
                          <span className="font-mono text-xs font-bold text-emerald-600">
                            {formatNum(stats.totalConfigured)} ({displayMatchRate}%)
                          </span>
                        </div>

                        <div 
                          onMouseEnter={() => setHoveredSegment("missing")}
                          onMouseLeave={() => setHoveredSegment(null)}
                          className={`p-2 rounded-xl border flex items-center justify-between transition-all cursor-default ${
                            hoveredSegment === "missing"
                              ? "bg-rose-50/50 border-rose-200 shadow-3xs text-rose-950 scale-101"
                              : "bg-slate-50/30 border-slate-150/40 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                            <span className="text-[11px] font-semibold">Hiện thiếu bộ Selectors</span>
                          </div>
                          <span className="font-mono text-xs font-bold text-rose-505">
                            {formatNum(stats.totalMissing)} ({100 - displayMatchRate}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Circular SVG Donut structure */}
                    <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full rotate--90" viewBox="0 0 100 100">
                        {/* Background track circle ring */}
                        <circle
                          cx="50"
                          cy="50"
                          r={radius}
                          fill="transparent"
                          stroke="#f1f5f9"
                          strokeWidth="11"
                        />
                        {/* Configured segment arc stroke */}
                        <motion.circle
                          cx="50"
                          cy="50"
                          r={radius}
                          fill="transparent"
                          stroke="#10b981"
                          strokeWidth={hoveredSegment === "configured" ? "15" : "11"}
                          strokeDasharray={circumference}
                          initial={{ strokeDashoffset: circumference }}
                          animate={{ strokeDashoffset: circumference - configuredStrokeDash }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                          strokeLinecap="round"
                          className="transition-all duration-300 cursor-pointer"
                          onMouseEnter={() => setHoveredSegment("configured")}
                          onMouseLeave={() => setHoveredSegment(null)}
                        />
                        {/* Missing segment arc stroke */}
                        {stats.totalMissing > 0 && (
                          <motion.circle
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="transparent"
                            stroke="#f43f5e"
                            strokeWidth={hoveredSegment === "missing" ? "15" : "11"}
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference - missingStrokeDash}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: -configuredStrokeDash }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            strokeLinecap="round"
                            className="transition-all duration-300 cursor-pointer"
                            onMouseEnter={() => setHoveredSegment("missing")}
                            onMouseLeave={() => setHoveredSegment(null)}
                          />
                        )}
                      </svg>
                      
                      {/* Center Gauge Stats display */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.span 
                          animate={{ scale: hoveredSegment ? 1.05 : 1 }}
                          className={`text-xl font-black font-sans tracking-tight ${
                            hoveredSegment === "configured" 
                              ? "text-emerald-600" 
                              : hoveredSegment === "missing" 
                              ? "text-rose-500" 
                              : "text-slate-900"
                          }`}
                        >
                          {hoveredSegment === "configured" 
                            ? `${displayMatchRate}%` 
                            : hoveredSegment === "missing" 
                            ? `${100 - displayMatchRate}%` 
                            : `${displayMatchRate}%`
                          }
                        </motion.span>
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mt-0.5">
                          {hoveredSegment ? hoveredSegment : "Độ Bao Phủ"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* CHARTS COLUMN B: Popular TLD breakdown bar charts */}
                  <div className="bg-white border border-slate-150/80 rounded-xl p-4 flex flex-col justify-between shadow-3xs group relative">
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-800 font-sans">
                          Phân loại Đuôi Tên miền (TLD Analysis)
                        </h4>
                        <div className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-150/20 shadow-3xs">
                          Top 5 Exts
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Biểu đồ tỉ lệ phân phối theo cấu trúc đuôi tên miền trong Whitelist hiện tại.
                      </p>
                    </div>

                    <div className="mt-4 space-y-2.5 flex-1 flex flex-col justify-center">
                      {tldData.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 italic text-[11px]">
                          Đang trích xuất cấu trúc tên miền...
                        </div>
                      ) : (
                        tldData.map((data, index) => {
                          const isHovered = hoveredTld === data.tld;
                          return (
                            <div 
                              key={index}
                              onMouseEnter={() => setHoveredTld(data.tld)}
                              onMouseLeave={() => setHoveredTld(null)}
                              className="space-y-1 relative"
                            >
                              {/* Row Label */}
                              <div className="flex items-center justify-between text-[11px] font-sans">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                  <span className="font-mono font-black text-slate-700">{data.tld}</span>
                                </div>
                                <span className="font-mono text-slate-400 text-[10px]">
                                  <strong>{data.count}</strong> miền ({data.percentage}%)
                                </span>
                              </div>

                              {/* Interactive Bar */}
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative cursor-pointer">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${data.percentage}%` }}
                                  transition={{ duration: 0.8, delay: index * 0.08, ease: "easeOut" }}
                                  className={`h-full rounded-full transition-colors ${
                                    isHovered 
                                      ? "bg-indigo-600 shadow-[0_0_6px_rgba(79,70,229,0.3)]" 
                                      : "bg-slate-400 group-hover:bg-indigo-500/80"
                                  }`}
                                ></motion.div>
                              </div>

                              {/* Interactive Custom Tooltip hovering */}
                              <AnimatePresence>
                                {isHovered && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                    animate={{ opacity: 1, y: -2, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="absolute bottom-full right-4 z-40 bg-slate-900 text-white text-[9.5px] px-2.5 py-1 rounded-lg shadow-xl flex items-center gap-1 font-sans pointer-events-none"
                                  >
                                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                                    <span>Đuôi {data.tld} chiếm {data.percentage}% Whitelist.</span>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
