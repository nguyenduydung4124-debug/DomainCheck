import { useState, useMemo, useEffect, Fragment } from "react";
import { WhitelistItem, DuplicateGroup } from "../types";
import { 
  Copy, 
  Check, 
  Search, 
  AlertCircle, 
  CheckCircle, 
  Code, 
  CornerDownRight, 
  FileCheck2, 
  ChevronsUpDown,
  Download,
  ExternalLink,
  PlusCircle,
  Layers,
  ListFilter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Play,
  FileCode,
  X,
  Sparkles,
  Wrench,
  Save
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ResultDetailsProps {
  matchedWhitelist: WhitelistItem[];
  duplicateGroups?: DuplicateGroup[];
  isVirtualList?: boolean;
  jsonText?: string;
  onUpdateJson?: (text: string) => void;
  isAdmin?: boolean;
  isConfigLocked?: boolean;
}

type TabType = "all" | "missing" | "configured" | "duplicates";
type SortOrder = "asc" | "desc" | null;

export default function ResultDetails({ 
  matchedWhitelist, 
  duplicateGroups = [], 
  isVirtualList = false,
  jsonText = "[]",
  onUpdateJson,
  isAdmin = false,
  isConfigLocked = false
}: ResultDetailsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "configured" | "missing">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [domainFilterQuery, setDomainFilterQuery] = useState("");
  const [copiedAll, setCopiedAll] = useState(false);
  const [copyFormat, setCopyFormat] = useState<"newline" | "comma" | "json">("newline");
  
  // Track copied status for individual items
  const [copiedItemMap, setCopiedItemMap] = useState<Record<string, boolean>>({});

  // Active item details modal
  const [selectedDetailItem, setSelectedDetailItem] = useState<WhitelistItem | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<"domain" | "original">("original");
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);

  // Feature 3: Smart Filtering States
  const [tldFilter, setTldFilter] = useState<string | null>(null);
  const [selectorCountFilter, setSelectorCountFilter] = useState<"all" | "zero" | "one" | "multiple">("all");

  // Feature 4: Inline Quick Config States
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editFormName, setEditFormName] = useState("");
  const [editFormQueries, setEditFormQueries] = useState("");
  const [editSuccessRowId, setEditSuccessRowId] = useState<string | null>(null);

  // Inline Quick Config Saving handler
  const handleSaveConfig = (item: WhitelistItem) => {
    if (!onUpdateJson) return;

    // Clean up selectors
    const queriesArray = editFormQueries
      .split(",")
      .map(q => q.trim())
      .filter(q => q.length > 0)
      .map(q => ({ selector: q }));

    let currentArray: any[] = [];
    try {
      currentArray = JSON.parse(jsonText);
      if (!Array.isArray(currentArray)) {
        currentArray = [];
      }
    } catch (e) {
      currentArray = [];
    }

    // Try to find the exact target by domain
    const targetIdx = currentArray.findIndex(
      (entry: any) => entry && typeof entry === "object" && entry.domain?.trim().toLowerCase() === item.cleanDomain
    );

    if (targetIdx >= 0) {
      // Update existing item
      currentArray[targetIdx] = {
        ...currentArray[targetIdx],
        css_queries: queriesArray
      };
      if (editFormName.trim()) {
        currentArray[targetIdx].name = editFormName.trim();
      }
    } else {
      // Insert new config item
      const newEntry: any = {
        domain: item.cleanDomain,
        css_queries: queriesArray
      };
      if (editFormName.trim()) {
        newEntry.name = editFormName.trim();
      } else {
        newEntry.name = item.cleanDomain;
      }
      currentArray.push(newEntry);
    }

    // Formulate beautifully ordered output
    const updatedJsonText = JSON.stringify(currentArray, null, 2);
    onUpdateJson(updatedJsonText);

    // Provide visual flash highlight cue
    setEditSuccessRowId(item.id);
    setEditingRowId(null);
    setTimeout(() => {
      setEditSuccessRowId(null);
    }, 2000);
  };

  const startEditing = (item: WhitelistItem) => {
    if (isConfigLocked && !isAdmin) {
      window.dispatchEvent(new CustomEvent("triggerAdminLogin", { 
        detail: { message: "Vui lòng đăng nhập quyền quản trị (Admin) để thực hiện chỉnh sửa cấu hình CSS!" } 
      }));
      return;
    }
    setEditingRowId(item.id);
    setEditFormName(item.matchedItem?.name || "");
    
    let queriesStr = "";
    if (item.matchedItem?.css_queries) {
      if (Array.isArray(item.matchedItem.css_queries)) {
        queriesStr = item.matchedItem.css_queries.map((q: any) => {
          if (q && typeof q === 'object') {
            return q.selector || q.query || q.css_query || JSON.stringify(q);
          }
          return String(q);
        }).join(", ");
      } else if (typeof item.matchedItem.css_queries === 'object') {
        const q = item.matchedItem.css_queries;
        queriesStr = q.selector || q.query || q.css_query || JSON.stringify(q);
      } else {
        queriesStr = String(item.matchedItem.css_queries);
      }
    }
    setEditFormQueries(queriesStr);
  };

  // Reset page index when filtered criteria, active list or size config changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, statusFilter, searchQuery, domainFilterQuery, itemsPerPage, tldFilter, selectorCountFilter]);

  // Filter lists based on tab & query
  const missingDomains = useMemo(() => {
    return matchedWhitelist.filter(item => !item.isMatched);
  }, [matchedWhitelist]);

  const configuredDomains = useMemo(() => {
    return matchedWhitelist.filter(item => item.isMatched);
  }, [matchedWhitelist]);

  // Filter duplicates based on search and domain specific query
  const filteredDuplicates = useMemo(() => {
    let result = duplicateGroups;
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase().trim();
      result = result.filter(group => 
        group.cleanDomain.includes(lowerQuery) ||
        group.occurrences.some(o => o.originalText.toLowerCase().includes(lowerQuery))
      );
    }
    if (domainFilterQuery.trim()) {
      const lowerDomain = domainFilterQuery.toLowerCase().trim();
      result = result.filter(group => 
        group.cleanDomain.includes(lowerDomain) ||
        group.occurrences.some(o => o.originalText.toLowerCase().includes(lowerDomain))
      );
    }
    return result;
  }, [duplicateGroups, searchQuery, domainFilterQuery]);

  const currentTabItems = useMemo(() => {
    if (activeTab === "all") {
      if (statusFilter === "configured") return configuredDomains;
      if (statusFilter === "missing") return missingDomains;
      return matchedWhitelist;
    }
    return activeTab === "missing" ? missingDomains : configuredDomains;
  }, [activeTab, statusFilter, matchedWhitelist, missingDomains, configuredDomains]);

  // Search and Domain Name filters
  const filteredItems = useMemo(() => {
    let items = currentTabItems;
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase().trim();
      items = items.filter(item => 
        item.cleanDomain.includes(lowerQuery) || 
        item.originalText.toLowerCase().includes(lowerQuery) ||
        (item.matchedItem?.name && item.matchedItem.name.toLowerCase().includes(lowerQuery))
      );
    }
    if (domainFilterQuery.trim()) {
      const lowerDomain = domainFilterQuery.toLowerCase().trim();
      items = items.filter(item => 
        item.cleanDomain.includes(lowerDomain) || 
        item.originalText.toLowerCase().includes(lowerDomain)
      );
    }

    // Feature 3: TLD Quick Tag Filter
    if (tldFilter) {
      items = items.filter(item => {
        const domain = item.cleanDomain.toLowerCase();
        if (tldFilter === ".com.vn") {
          return domain.endsWith(".com.vn");
        } else if (tldFilter === "Khác") {
          const ending = domain.split(".").pop() || "";
          return !["vn", "com", "net"].includes(ending);
        } else {
          return domain.endsWith(tldFilter);
        }
      });
    }

    // Feature 3: Selector Count Filter
    if (selectorCountFilter !== "all") {
      items = items.filter(item => {
        const count = item.matchedItem?.css_queries?.length || 0;
        if (selectorCountFilter === "zero") return count === 0;
        if (selectorCountFilter === "one") return count === 1;
        if (selectorCountFilter === "multiple") return count > 1;
        return true;
      });
    }

    return items;
  }, [currentTabItems, searchQuery, domainFilterQuery, tldFilter, selectorCountFilter]);

  // Sort filter
  const sortedItems = useMemo(() => {
    if (!sortOrder) return filteredItems;
    
    return [...filteredItems].sort((a, b) => {
      let valA = sortField === "domain" ? a.cleanDomain : a.originalText;
      let valB = sortField === "domain" ? b.cleanDomain : b.originalText;
      
      if (sortOrder === "asc") {
        return valA.localeCompare(valB);
      } else {
        return valB.localeCompare(valA);
      }
    });
  }, [filteredItems, sortField, sortOrder]);

  // Paginated Matrix Data Slices
  const currentPagedItems = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return sortedItems.slice(startIdx, startIdx + itemsPerPage);
  }, [sortedItems, currentPage, itemsPerPage]);

  const currentPagedDuplicates = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredDuplicates.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredDuplicates, currentPage, itemsPerPage]);

  // Derived calculations for indices
  const totalItemsCount = activeTab === "duplicates" ? filteredDuplicates.length : filteredItems.length;
  const totalPages = Math.ceil(totalItemsCount / itemsPerPage) || 1;
  const itemStart = totalItemsCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const itemEnd = Math.min(currentPage * itemsPerPage, totalItemsCount);

  // Intelligent Sliding Window layout indicator list [1, ..., k, k+1, k+2, ..., n]
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push("...");
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push("...");
      }
      pages.push(totalPages);
    }
    return pages;
  };

  // Copy bulk missing list
  const handleCopyMissingBulk = () => {
    if (missingDomains.length === 0) return;
    
    const domainsList = missingDomains.map(item => item.cleanDomain);
    let outputText = "";
    
    switch (copyFormat) {
      case "comma":
        outputText = domainsList.join(", ");
        break;
      case "json":
        outputText = JSON.stringify(domainsList, null, 2);
        break;
      case "newline":
      default:
        outputText = domainsList.join("\n");
        break;
    }
    
    navigator.clipboard.writeText(outputText).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    });
  };

  // Copy individual item
  const handleCopySingle = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedItemMap(prev => ({ ...prev, [id]: true }));
      setTimeout(() => {
        setCopiedItemMap(prev => ({ ...prev, [id]: false }));
      }, 1500);
    });
  };

  // Export main reconciliation report
  const handleExportCSV = () => {
    if (matchedWhitelist.length === 0) return;
    
    // Thêm ký tự Byte Order Mark (BOM) để Microsoft Excel tự động nhận biết hệ UTF-8, tránh lỗi font Tiếng Việt
    const BOM = "\uFEFF";
    
    // Calculate stats details
    const totalCount = matchedWhitelist.length;
    const configuredCount = configuredDomains.length;
    const missingCount = missingDomains.length;
    const configuredRate = totalCount > 0 ? ((configuredCount / totalCount) * 100).toFixed(1) : "0.0";
    const missingRate = totalCount > 0 ? ((missingCount / totalCount) * 100).toFixed(1) : "0.0";
    
    const duplicatesCount = duplicateGroups.reduce((acc, curr) => acc + curr.count, 0);
    const duplicatesUniqueCount = duplicateGroups.length;

    // Time generation
    const localTimeStr = new Date().toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

    let csvContent = "";

    // Helper functions for CSV formatting
    const escapeCsv = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '""';
      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    // ==========================================
    // SECTION 1: REPORT BANNER & SUMMARY KPI
    // ==========================================
    csvContent += "====================================================================================================\r\n";
    csvContent += "BÁO CÁO TỔNG HỢP THÔNG MINH - ĐỐI CHIẾU DANH SÁCH WHITELIST & CẤU HÌNH CRAWLER SELECTORS\r\n";
    csvContent += "====================================================================================================\r\n";
    csvContent += `Thời điểm xuất báo cáo,${escapeCsv(localTimeStr)} (Giờ hệ thống)\r\n`;
    csvContent += "Loại dữ liệu đối soát,Whitelist Domains vs. Web Crawler JSON selectors\r\n";
    csvContent += `Trạng thái hoàn thành cấu hình chung,${configuredCount === totalCount ? "ĐÃ HOÀN THÀNH 100%" : `${configuredRate}% (Cần cập nhật các tên miền còn thiếu)`}\r\n`;
    csvContent += "\r\n";
    
    csvContent += "CHỈ SỐ ĐO LƯỜNG ĐỐI SOÁT (KPI SUMMARY)\r\n";
    csvContent += "--------------------------------------------------------\r\n";
    csvContent += `Tổng số tên miền trong danh sách Whitelist,${totalCount},tên miền\r\n`;
    csvContent += `Đã có bộ CSS Selector tương khớp (Configured),${configuredCount},tên miền (${configuredRate}%)\r\n`;
    csvContent += `Chưa có bộ cấu hình Selector (Missing),${missingCount},tên miền (${missingRate}%)\r\n`;
    csvContent += `Sự cố lặp trùng (Domain Duplicates),${duplicatesUniqueCount} nhóm (${duplicatesCount} dòng trùng lặp),cần được dọn dẹp khỏi Whitelist\r\n`;
    csvContent += "\r\n";
    csvContent += "\r\n";

    // ==========================================
    // SECTION 2: CONFIGURATION DETAILS TABLE
    // ==========================================
    csvContent += "====================================================================================================\r\n";
    csvContent += "PHẦN 1: BẢNG CHI TIẾT TÌNH TRẠNG CẤU HÌNH TẤT CẢ TÊN MIỀN (TOTAL DOMAIN CONFIGURATION MATRIX)\r\n";
    csvContent += "====================================================================================================\r\n";
    csvContent += "STT,Tên Miền Sạch,Trạng Thái Đối Soát,Tên Cấu Hình Khớp (JSON),Số lượng CSS Selectors,Nội dung Dòng gốc (Whitelist),Bộ CSS Selectors chi tiết\r\n";

    matchedWhitelist.forEach((item, index) => {
      let selectorsCount = 0;
      let selectorsJoined = "";
      if (item.matchedItem?.css_queries) {
        if (Array.isArray(item.matchedItem.css_queries)) {
          selectorsCount = item.matchedItem.css_queries.length;
          selectorsJoined = item.matchedItem.css_queries
            .map((q: any) => {
              if (q && typeof q === "object") {
                return q.selector || q.query || q.css_query || JSON.stringify(q);
              }
              return String(q);
            })
            .join(" | ");
        } else if (typeof item.matchedItem.css_queries === "object") {
          selectorsCount = 1;
          const q = item.matchedItem.css_queries;
          selectorsJoined = q.selector || q.query || q.css_query || JSON.stringify(q);
        } else {
          selectorsCount = 1;
          selectorsJoined = String(item.matchedItem.css_queries);
        }
      }

      const status = item.isMatched ? "✅ ĐÃ CẤU HÌNH" : "❌ CHƯA CÓ SELECTOR";
      const matchedName = item.matchedItem?.name || "N/A";

      const row = [
        index + 1,
        escapeCsv(item.cleanDomain),
        escapeCsv(status),
        escapeCsv(matchedName),
        selectorsCount,
        escapeCsv(item.originalText),
        escapeCsv(selectorsJoined)
      ].join(",");

      csvContent += row + "\r\n";
    });

    csvContent += "\r\n\r\n";

    // ==========================================
    // SECTION 3: LIST OF MISSING DOMAINS FOR DEV TEAM
    // ==========================================
    csvContent += "====================================================================================================\r\n";
    csvContent += "PHẦN 2: DANH SÁCH TÊN MIỀN CHƯA CÀI ĐẶT BỘ CRAWLER SELECTORS (MISSING ACTION-NEEDED LIST)\r\n";
    csvContent += "====================================================================================================\r\n";
    csvContent += "STT,Phổ biến / Độ ưu tiên,Tên Miền Sạch,Dòng Thô Nguyên Bản Cần Cấu Hình\r\n";

    if (missingDomains.length === 0) {
      csvContent += "Thông báo,Chúc mừng! Không còn bất kỳ tên miền nào bị thiếu cấu hình selectors.,,\r\n";
    } else {
      missingDomains.forEach((item, index) => {
        const row = [
          index + 1,
          "Ưu tiên cao",
          escapeCsv(item.cleanDomain),
          escapeCsv(item.originalText)
        ].join(",");
        csvContent += row + "\r\n";
      });
    }

    csvContent += "\r\n\r\n";

    // ==========================================
    // SECTION 4: LIST OF DUPLICATE GROUPS
    // ==========================================
    csvContent += "====================================================================================================\r\n";
    csvContent += "PHẦN 3: PHÁT HIỆN SỰ CỐ TÊN MIỀN TRÙNG LẶP TRONG TỆP WHITELIST (WHITELIST REDUNDANCY AUDIT)\r\n";
    csvContent += "====================================================================================================\r\n";
    csvContent += "STT Nhóm,Tên Miền Sạch bị trùng lặp,Số lần lặp trùng,Vị trí dòng lặp trùng trong Whitelist,Nội dung dữ liệu thô gốc\r\n";

    if (duplicateGroups.length === 0) {
      csvContent += "Thông báo,Hệ thống không phát hiện bất kỳ trường hợp trùng lặp hay dư thừa nào trong Whitelist.,,,\r\n";
    } else {
      duplicateGroups.forEach((group, groupIndex) => {
        group.occurrences.forEach((oc, idx) => {
          const groupLabel = idx === 0 ? `Nhóm ${groupIndex + 1}` : "";
          const domainLabel = idx === 0 ? group.cleanDomain : "";
          const occurrenceCount = idx === 0 ? `${group.count} lần` : "";
          
          const row = [
            escapeCsv(groupLabel),
            escapeCsv(domainLabel),
            escapeCsv(occurrenceCount),
            `"Dòng thứ ${oc.lineNumber}"`,
            escapeCsv(oc.originalText)
          ].join(",");
          csvContent += row + "\r\n";
        });
      });
    }

    csvContent += "\r\n";
    csvContent += "====================================================================================================\r\n";
    csvContent += "HẾT BÁO CÁO. Cảm ơn bạn đã sử dụng Crawler Config Audit System!\r\n";
    csvContent += "====================================================================================================\r\n";

    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao_Cao_Tong_Hop_Crawler_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export duplicates-only report
  const handleExportDuplicatesCSV = () => {
    if (duplicateGroups.length === 0) return;
    
    const BOM = "\uFEFF";
    let dupCsvContent = "Tên miền sạch (Duy nhất),Số lần lặp trùng,Danh sách dòng gốc (Line Number),Nội dung dòng thô gốc trong Whitelist\n";
    
    duplicateGroups.forEach(group => {
      group.occurrences.forEach((oc, idx) => {
        // Dòng đầu tiên của nhóm lặp: hiển thị tên miền sạch và tổng số lần lặp
        // Các dòng kế tiếp: để trống cột đầu để nhìn trực quan phân nhóm
        const cleanName = idx === 0 ? group.cleanDomain : "";
        const lặpCount = idx === 0 ? `${group.count} lần` : "";
        
        const row = [
          `"${cleanName}"`,
          `"${lặpCount}"`,
          `"Dòng ${oc.lineNumber}"`,
          `"${oc.originalText.replace(/"/g, '""')}"`
        ].join(",");
        
        dupCsvContent += row + "\r\n";
      });
    });
    
    const blob2 = new Blob([BOM + dupCsvContent], { type: "text/csv;charset=utf-8;" });
    const url2 = URL.createObjectURL(blob2);
    
    const link2 = document.createElement("a");
    link2.setAttribute("href", url2);
    link2.setAttribute("download", `ten_mien_lap_trung_${Date.now()}.csv`);
    document.body.appendChild(link2);
    link2.click();
    document.body.removeChild(link2);
    URL.revokeObjectURL(url2);
  };

  const toggleSort = (field: "domain" | "original") => {
    if (sortField === field) {
      setSortOrder(prev => (prev === "asc" ? "desc" : prev === "desc" ? null : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_6px_25px_rgba(0,0,0,0.03)]" id="results-display-section">
      
      {/* Tab Navigation header styling */}
      <div className="px-5 py-4 bg-slate-50/70 border-b border-slate-200/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Navigation tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl w-fit flex-wrap gap-1 relative border border-slate-200/65" id="tabs-container">
          <button
            onClick={() => {
              setActiveTab("all");
              setStatusFilter("all");
              setSearchQuery("");
              setDomainFilterQuery("");
            }}
            id="tab-btn-all"
            className={`relative px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-lg flex items-center gap-2 cursor-pointer transition-colors duration-200 focus:outline-none ${
              activeTab === "all"
                ? "text-slate-900"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {activeTab === "all" && (
              <motion.span
                layoutId="activeTabPill"
                className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/50 z-0"
                transition={{ type: "spring", stiffness: 380, damping: 25 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-indigo-650" />
              <span>Tất cả</span>
              <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all duration-200 ${
                activeTab === "all" 
                  ? "bg-slate-900 text-white" 
                  : "bg-slate-200 text-slate-750"
              }`}>
                {matchedWhitelist.length}
              </span>
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("missing");
              setStatusFilter("missing");
              setSearchQuery("");
              setDomainFilterQuery("");
            }}
            id="tab-btn-missing"
            className={`relative px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-lg flex items-center gap-2 cursor-pointer transition-colors duration-200 focus:outline-none ${
              activeTab === "missing"
                ? "text-slate-900"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {activeTab === "missing" && (
              <motion.span
                layoutId="activeTabPill"
                className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/50 z-0"
                transition={{ type: "spring", stiffness: 380, damping: 25 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <AlertCircle className={`w-4 h-4 transition-colors ${activeTab === "missing" ? "text-rose-500" : "text-slate-400"}`} />
              <span>Chưa có cấu hình JSON</span>
              <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all duration-200 ${
                activeTab === "missing" 
                  ? "bg-rose-100 text-rose-700" 
                  : "bg-slate-200 text-slate-700"
              }`}>
                {missingDomains.length}
              </span>
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("configured");
              setStatusFilter("configured");
              setSearchQuery("");
              setDomainFilterQuery("");
            }}
            id="tab-btn-configured"
            className={`relative px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-lg flex items-center gap-2 cursor-pointer transition-colors duration-200 focus:outline-none ${
              activeTab === "configured"
                ? "text-slate-900"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {activeTab === "configured" && (
              <motion.span
                layoutId="activeTabPill"
                className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/50 z-0"
                transition={{ type: "spring", stiffness: 380, damping: 25 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <CheckCircle className={`w-4 h-4 transition-colors ${activeTab === "configured" ? "text-emerald-555" : "text-slate-400"}`} />
              <span>Đã có cấu hình</span>
              <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all duration-200 ${
                activeTab === "configured" 
                  ? "bg-emerald-100 text-emerald-800" 
                  : "bg-slate-200 text-slate-750"
              }`}>
                {configuredDomains.length}
              </span>
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("duplicates");
              setSearchQuery("");
              setDomainFilterQuery("");
            }}
            id="tab-btn-duplicates"
            className={`relative px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded-lg flex items-center gap-2 cursor-pointer transition-colors duration-200 focus:outline-none ${
              activeTab === "duplicates"
                ? "text-slate-900"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {activeTab === "duplicates" && (
              <motion.span
                layoutId="activeTabPill"
                className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/50 z-0"
                transition={{ type: "spring", stiffness: 380, damping: 25 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Layers className={`w-4 h-4 transition-colors ${activeTab === "duplicates" ? "text-amber-500 font-bold" : "text-slate-400"}`} />
              <span>Phát hiện lặp trùng</span>
              <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all duration-200 ${
                duplicateGroups.length > 0
                  ? (activeTab === "duplicates" ? "bg-amber-100 text-amber-800 animate-pulse" : "bg-amber-50 text-amber-600 border border-amber-200/50")
                  : "bg-slate-200 text-slate-600"
              }`}>
                {duplicateGroups.length}
              </span>
            </span>
          </button>
        </div>

        {/* Global Export File Action */}
        <div className="flex items-center gap-2 lg:ml-auto" id="export-buttons-group">
          {matchedWhitelist.length > 0 && (
            <button
              onClick={handleExportCSV}
              id="btn-export-reports"
              className={`inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all duration-200 shadow-3xs cursor-pointer active:scale-97 border ${
                activeTab !== "duplicates"
                  ? "text-white bg-slate-900 border-slate-950 hover:bg-slate-800 shadow-md"
                  : "text-slate-700 bg-white hover:bg-slate-50 border-slate-200"
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Báo Cáo Đối Chiếu</span>
            </button>
          )}

          {duplicateGroups.length > 0 && (
            <button
              onClick={handleExportDuplicatesCSV}
              id="btn-export-duplicates"
              className={`inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all duration-200 shadow-3xs cursor-pointer active:scale-97 border ${
                activeTab === "duplicates"
                  ? "text-white bg-amber-600 border-amber-700 hover:bg-amber-700 shadow-md"
                  : "text-slate-700 bg-white hover:bg-slate-50 border-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Xuất Báo Cáo Trùng Lặp</span>
            </button>
          )}
        </div>
      </div>

      {/* Visual notification if displaying virtual JSON domains because Whitelist is empty */}
      {isVirtualList && (
        <div className="mx-5 mt-4 p-3 bg-indigo-50/65 border border-indigo-150 rounded-xl flex items-start gap-2.5 text-indigo-950 font-sans shadow-3xs">
          <Sparkles className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0 animate-pulse" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-extrabold uppercase tracking-wide">💡 Chế độ Khảo sát Cấu hình JSON</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Danh sách Whitelist đang trống. Hệ thống đang tự động trích xuất và hiển thị trực tiếp danh sách <strong>{matchedWhitelist.length}</strong> cấu hình tên miền trong tệp JSON Crawler ở trên để bạn kiểm tra thông số kỹ thuật.
            </p>
          </div>
        </div>
      )}

      {/* Auxiliary utilities and list filter checks */}
      <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-100/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search Input and Status Dropdown Filter handle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-3xl">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder={
                activeTab === "duplicates"
                  ? "Tìm kiếm tên miền trùng lặp..."
                  : activeTab === "all"
                  ? "Tìm kiếm tên miền trong tất cả..."
                  : `Tìm kiếm tên miền trong danh sách ${activeTab === "missing" ? "chưa có" : "đã có"}...`
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="table-search-input"
              className="w-full pl-10 pr-3 py-2 text-xs text-slate-700 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 rounded-xl outline-none transition-shadow font-sans shadow-3xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Domain name filter input */}
            <div className="relative w-48 sm:w-52 shrink-0">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <ListFilter className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Lọc theo tên miền..."
                value={domainFilterQuery}
                onChange={(e) => setDomainFilterQuery(e.target.value)}
                id="domain-name-filter-input"
                className="w-full pl-9 pr-7 py-2 text-xs text-slate-700 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-505 rounded-xl outline-none transition-shadow font-mono shadow-3xs"
              />
              {domainFilterQuery && (
                <button
                  onClick={() => setDomainFilterQuery("")}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  title="Xoá bộ lọc"
                >
                  <span className="text-[14px] leading-none font-bold">×</span>
                </button>
              )}
            </div>

            {activeTab !== "duplicates" && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-0.5">
                  Trạng thái:
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setStatusFilter(val);
                    if (val === "configured") {
                      setActiveTab("configured");
                    } else if (val === "missing") {
                      setActiveTab("missing");
                    } else {
                      setActiveTab("all");
                    }
                  }}
                  className="text-xs text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer font-bold uppercase tracking-wider text-[10px] shadow-3xs"
                  id="status-filter-select"
                >
                  <option value="all">Tất cả ({matchedWhitelist.length})</option>
                  <option value="configured">Đã cấu hình ({configuredDomains.length})</option>
                  <option value="missing">Chưa cấu hình ({missingDomains.length})</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic actions depending active tab */}
        {activeTab === "missing" ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5" id="bulk-copy-controls">
            
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-extrabold border border-slate-200/60" id="copy-formats-group">
              <button
                onClick={() => setCopyFormat("newline")}
                className={`px-2.5 py-1.5 rounded-md transition-all cursor-pointer uppercase ${
                  copyFormat === "newline" ? "bg-white text-slate-950 shadow-3xs font-black" : "text-slate-500 hover:text-slate-700"
                }`}
                title="Sao chép mỗi tên miền trên một dòng riêng biệt"
              >
                Dòng mới
              </button>
              <button
                onClick={() => setCopyFormat("comma")}
                className={`px-2.5 py-1.5 rounded-md transition-all cursor-pointer uppercase ${
                  copyFormat === "comma" ? "bg-white text-slate-955 shadow-3xs font-black" : "text-slate-500 hover:text-slate-700"
                }`}
                title="Sao chép dạng phân tách bằng dấu phẩy"
              >
                Dấu phẩy
              </button>
              <button
                onClick={() => setCopyFormat("json")}
                className={`px-2.5 py-1.5 rounded-md transition-all cursor-pointer uppercase ${
                  copyFormat === "json" ? "bg-white text-slate-955 shadow-3xs font-black" : "text-slate-500 hover:text-slate-700"
                }`}
                title="Sao chép dưới dạng mảng JSON ['a','b']"
              >
                Array JSON
              </button>
            </div>

            <button
              onClick={handleCopyMissingBulk}
              disabled={missingDomains.length === 0}
              id="btn-copy-all-missing"
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-3xs w-full sm:w-auto cursor-pointer ${
                missingDomains.length === 0
                  ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  : copiedAll
                  ? "bg-emerald-600 text-white"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedAll ? "Đã sao chép!" : `Copy nhanh list (${missingDomains.length})`}
            </button>
          </div>
        ) : activeTab === "duplicates" ? (
          <div className="text-xs text-slate-750 flex items-center gap-2 font-sans font-extrabold uppercase tracking-wide">
            <Layers className="w-4.5 h-4.5 text-amber-500 shrink-0" />
            <span>Phát hiện <strong className="text-amber-600 font-black">{duplicateGroups.length}</strong> nhóm lặp trùng</span>
          </div>
        ) : (
          <div className="text-xs text-slate-500 flex items-center gap-2 font-medium">
            <FileCheck2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <span>Quy tắc thu nạp selectors từ tệp cấu hình JSON</span>
          </div>
        )}
      </div>

      {/* Feature 3: Smart Interactive Filtering Toolbar (Chips and Density Filters) */}
      {activeTab !== "duplicates" && (
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-start gap-6 text-xs font-sans text-slate-600 animate-fade-in select-none overflow-x-auto scrollbar-thin whitespace-nowrap">
          {/* TLD Filter section */}
          <div className="flex flex-nowrap items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mr-1 shrink-0">
              Phân loại Đuôi Tên miền (TLD Filter):
            </span>
            {[
              { label: "Tất cả", value: null },
              { label: ".vn", value: ".vn" },
              { label: ".com.vn", value: ".com.vn" },
              { label: ".com", value: ".com" },
              { label: ".net", value: ".net" },
              { label: "Khác", value: "Khác" }
            ].map(chip => {
              const isActive = tldFilter === chip.value;
              return (
                <button
                  type="button"
                  key={chip.label}
                  onClick={() => setTldFilter(chip.value)}
                  className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold border cursor-pointer transition-all duration-150 shrink-0 ${
                    isActive
                      ? "bg-slate-900 border-slate-950 text-white shadow-3xs scale-102 font-black"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-350"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          <span className="inline-block w-px h-4 bg-slate-200 shrink-0"></span>

          {/* Selector density filter section */}
          <div className="flex flex-nowrap items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mr-1 shrink-0">
              Mật độ Selectors (Density Filter):
            </span>
            {[
              { label: "Tất cả", value: "all" },
              { label: "Thiếu Selector (0)", value: "zero" },
              { label: "Duy nhất (1)", value: "one" },
              { label: "Nhiều Selectors (>1)", value: "multiple" }
            ].map(chip => {
              const isActive = selectorCountFilter === chip.value;
              return (
                <button
                  type="button"
                  key={chip.label}
                  onClick={() => setSelectorCountFilter(chip.value as any)}
                  className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold border cursor-pointer transition-all duration-150 shrink-0 ${
                    isActive
                      ? "bg-indigo-600 border-indigo-700 text-white shadow-3xs scale-102 font-black"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-indigo-50/50 hover:border-indigo-200"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Results Table */}
      <div className="overflow-x-auto">
        {activeTab === "duplicates" ? (
          duplicateGroups.length === 0 ? (
            <div className="p-10 text-center bg-slate-50/10" id="empty-state-duplicates">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2.5" />
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Không phát hiện trùng lặp</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto font-sans leading-relaxed">
                Tuyệt vời! Danh sách Whitelist của bạn hoàn chỉnh và không chứa bất kỳ bản ghi trùng lặp nào sau khi mài sạch và chuẩn hóa.
              </p>
            </div>
          ) : filteredDuplicates.length === 0 ? (
            <div className="p-10 text-center bg-slate-50/10" id="empty-state-duplicates-search">
              <Search className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Không tìm thấy kết quả phù hợp</p>
              <p className="text-[11px] text-slate-400 mt-1 font-sans">
                Từ khóa &quot;{searchQuery}&quot; không khớp với bất kỳ tên miền trùng lặp nào.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse" id="duplicates-table">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200">
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans w-1/4">
                    Tên miền làm sạch (Duy nhất)
                  </th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans w-1/5 text-center">
                    Số lần xuất hiện thô
                  </th>
                  <th className="py-2.5 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans w-11/20">
                    Bản ghi thô gốc & Dòng tương ứng
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-205 text-[11px]">
                {currentPagedDuplicates.map((group, gIdx) => {
                  const actualIndex = (currentPage - 1) * itemsPerPage + gIdx;
                  const isCopied = !!copiedItemMap[`dup-${actualIndex}`];
                  return (
                    <motion.tr 
                      key={actualIndex} 
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: Math.min(gIdx * 0.03, 0.3) }}
                      className="hover:bg-slate-50/70 transition-colors duration-100 group"
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1 font-mono font-black text-slate-950">
                          <span>{group.cleanDomain}</span>
                          <button
                            onClick={() => handleCopySingle(`dup-${actualIndex}`, group.cleanDomain)}
                            title="Sao chép tên miền sạch"
                            className="text-slate-400 hover:text-slate-700 p-0.5 rounded hover:bg-slate-200/50 inline-flex transition-colors cursor-pointer"
                          >
                            {isCopied ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200/60 shadow-2xs">
                          {group.count} lần lặp
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex flex-col gap-1">
                          {group.occurrences.map((oc, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-2 text-slate-605 leading-relaxed">
                              <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-100 border border-slate-200 text-slate-500 min-w-[55px] text-center">
                                Dòng {oc.lineNumber}
                              </span>
                              <span className="font-mono text-slate-800 break-all bg-slate-50/50 px-1 py-0.2 rounded border border-slate-200/40">
                                {oc.originalText}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          )
        ) : matchedWhitelist.length === 0 ? (
          <div className="p-10 text-center bg-slate-50/10" id="empty-state-no-data">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2.5 animate-pulse" />
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Không có dữ liệu đối chiếu</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto font-sans leading-relaxed">
              Nhập hoặc dán danh sách Whitelist cùng bộ quy tắc JSON Crawler ở phía trên để bắt đầu đối soát tự động.
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-10 text-center bg-slate-50/10" id="empty-state-search">
            <Search className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Không tìm thấy kết quả phù hợp</p>
            <p className="text-[11px] text-slate-400 mt-1 font-sans">
              Từ khóa &quot;{searchQuery}&quot; không trùng khớp với bất kỳ tên miền nào ở tab này.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse" id="results-table">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="py-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans w-4/12">
                  <button 
                    onClick={() => toggleSort("original")}
                    className="flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                  >
                    Tên miền whitelist gốc / Làm sạch
                    <ChevronsUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans w-2/12 text-center">
                  Trạng thái đối sánh
                </th>
                <th className="py-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans w-4/12 animate-fade-in">
                  Quy tắc thu nạp CSS (Selectors)
                </th>
                <th className="py-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans w-2/12 text-center">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[11px]">
              {currentPagedItems.map((item, index) => {
                const isItemCopied = !!copiedItemMap[item.id];
                const isEditing = editingRowId === item.id;
                const hasSucceeded = editSuccessRowId === item.id;
                
                return (
                  <Fragment key={item.id}>
                    <motion.tr 
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: Math.min(index * 0.015, 0.25) }}
                      className={`hover:bg-slate-50/70 transition-all duration-150 group ${
                        isEditing 
                          ? "bg-indigo-50/30 font-semibold border-indigo-150" 
                          : hasSucceeded 
                          ? "bg-emerald-50/70 border-y border-emerald-400 animate-pulse duration-1000" 
                          : ""
                      }`}
                    >
                      
                      {/* Domain columns */}
                      <td className="py-2.5 px-4 font-sans">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-slate-955 font-bold text-[11.5px]">{item.originalText}</span>
                            <button
                              onClick={() => handleCopySingle(item.id, item.cleanDomain)}
                              title="Sao chép tên miền sạch"
                              className="text-slate-400 hover:text-slate-700 p-0.5 rounded hover:bg-slate-200/50 inline-flex transition-colors cursor-pointer shrink-0"
                            >
                              {isItemCopied ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            
                            {/* Visual TLD Badge */}
                            {(() => {
                              const displayExt = item.cleanDomain.endsWith(".com.vn") ? ".com.vn" : `.${item.cleanDomain.split(".").pop()}`;
                              return (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[9px] font-mono font-bold bg-slate-100 text-slate-500 border border-slate-200/60 select-none uppercase">
                                  {displayExt}
                                </span>
                              );
                            })()}
                          </div>
                          
                          {/* If matching domain differs from original name, display a mini indicator */}
                          {item.originalText.toLowerCase() !== item.cleanDomain && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                              <CornerDownRight className="w-3 h-3 text-slate-300" />
                              <span>Đã qua xử lý: <code className="font-mono bg-slate-100 border border-slate-200/60 px-1 rounded text-slate-600 font-medium">{item.cleanDomain}</code></span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Matching labels */}
                      <td className="py-2.5 px-4 text-center">
                        {item.isMatched ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 border border-emerald-200 shadow-2xs">
                            <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                            Đã cấu hình
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-800 border border-rose-200 shadow-2xs">
                            <span className="w-1 h-1 rounded-full bg-rose-500 animate-pulse"></span>
                            Chưa có
                          </span>
                        )}
                      </td>

                      {/* Selectors display columns */}
                      <td className="py-2.5 px-4">
                        {item.isMatched && item.matchedItem ? (
                          <div className="space-y-1">
                            {/* Extracted selectors array */}
                            {item.matchedItem.css_queries && Array.isArray(item.matchedItem.css_queries) && item.matchedItem.css_queries.length > 0 ? (
                              item.matchedItem.css_queries.length === 1 ? (
                                // Single selector format: clean and compact
                                (() => {
                                  const q = item.matchedItem.css_queries[0];
                                  const selectorText = q && typeof q === 'object'
                                    ? (q.selector || q.query || q.css_query || JSON.stringify(q))
                                    : String(q);
                                  const isSelCopied = !!copiedItemMap[`${item.id}-sel-0`];
                                  return (
                                    <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded px-2 py-0.5 hover:bg-white hover:border-slate-355 transition-all">
                                      <span className="font-mono text-[10px] font-bold text-slate-700 flex items-center gap-1">
                                        <Code className="w-3 h-3 text-slate-400" />
                                        {selectorText}
                                      </span>
                                      <button
                                        onClick={() => handleCopySingle(`${item.id}-sel-0`, selectorText)}
                                        className="text-slate-400 hover:text-indigo-650 p-0.5 rounded hover:bg-slate-200/50 transition-colors cursor-pointer"
                                        title="Sao chép Quy tắc"
                                      >
                                        {isSelCopied ? (
                                          <Check className="w-2.5 h-2.5 text-emerald-600" />
                                        ) : (
                                          <Copy className="w-2.5 h-2.5" />
                                        )}
                                      </button>
                                    </div>
                                  );
                                })()
                              ) : (
                                // Multiple selectors format: beautifully organized numbered list with left border accent
                                <div className="space-y-1.5 max-w-md" id={`selector-list-${item.id}`}>
                                  <div className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400/90 flex items-center gap-1 select-none">
                                    <span>Danh sách quy tắc CSS ({item.matchedItem.css_queries.length}):</span>
                                  </div>
                                  <div className="flex flex-col gap-1 border-l-2 border-indigo-200 pl-2.5">
                                    {item.matchedItem.css_queries.map((q: any, qIdx: number) => {
                                      const selectorText = q && typeof q === 'object'
                                        ? (q.selector || q.query || q.css_query || JSON.stringify(q))
                                        : String(q);
                                      const isSelCopied = !!copiedItemMap[`${item.id}-sel-${qIdx}`];
                                      return (
                                        <div 
                                          key={qIdx}
                                          className="flex items-center justify-between gap-3 bg-slate-50 hover:bg-white border border-slate-200/60 hover:border-indigo-250 rounded pl-2 pr-1 py-0.5 transition-all group/sel"
                                        >
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-[9px] font-mono font-bold bg-slate-200/80 text-slate-600 px-1 py-0.2 rounded shrink-0">
                                              #{qIdx + 1}
                                            </span>
                                            <span className="font-mono text-[10px] font-bold text-slate-800 truncate" title={selectorText}>
                                              {selectorText}
                                            </span>
                                          </div>
                                          <button
                                            onClick={() => handleCopySingle(`${item.id}-sel-${qIdx}`, selectorText)}
                                            className="text-slate-400 hover:text-indigo-605 p-0.5 rounded hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                                            title={`Sao chép quy tắc #${qIdx + 1}`}
                                          >
                                            {isSelCopied ? (
                                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                                            ) : (
                                              <Copy className="w-2.5 h-2.5" />
                                            )}
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )
                            ) : item.matchedItem.css_queries ? (
                              <span className="font-mono text-[11px] text-slate-605 bg-slate-100 px-1.5 py-0.5 border border-slate-200 rounded">
                                {/* If css_queries is not array but string or object */}
                                {typeof item.matchedItem.css_queries === 'object'
                                  ? (item.matchedItem.css_queries.selector || item.matchedItem.css_queries.query || item.matchedItem.css_queries.css_query || JSON.stringify(item.matchedItem.css_queries))
                                  : String(item.matchedItem.css_queries)}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic font-medium">Bản ghi trùng khớp nhưng chưa khai báo selector</span>
                            )}

                            {/* Extra info from crawler item if available */}
                            {item.matchedItem.name && (
                              <p className="text-[10px] text-slate-400 font-sans">
                                Đơn vị / Tên crawler: <strong className="text-slate-500 font-semibold">{item.matchedItem.name}</strong>
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400 italic">
                            <span>Thiếu quy tắc crawl</span>
                            <span className="text-[10px] non-italic text-slate-200">|</span>
                            <button
                              onClick={() => {
                                // Trigger an easy template generation logic
                                const templateText = `{ "domain": "${item.cleanDomain}", "css_queries": ["body"] }`;
                                handleCopySingle(`${item.id}-tpl`, templateText);
                              }}
                              className="text-[10px] non-italic text-indigo-650 hover:text-indigo-805 font-bold uppercase transition-all inline-flex items-center gap-0.5 hover:underline pointer-cursor"
                            >
                              <PlusCircle className="w-3 h-3" />
                              {copiedItemMap[`${item.id}-tpl`] ? "Đã sao chép!" : "Lấy mẫu JSON"}
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailItem(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-indigo-700 hover:text-white bg-indigo-50 hover:bg-indigo-650 border border-indigo-100 rounded-lg transition-all cursor-pointer shadow-3xs hover:shadow-2xs active:scale-95 text-center font-sans shrink-0"
                            title="Xem thông số kỹ thuật chi tiết"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Chi tiết</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (isConfigLocked && !isAdmin) {
                                window.dispatchEvent(new CustomEvent("triggerAdminLogin", { 
                                  detail: { message: "Vui lòng đăng nhập quyền quản trị (Admin) để thực hiện chỉnh sửa cấu hình CSS!" } 
                                }));
                              } else {
                                if (isEditing) {
                                  setEditingRowId(null);
                                } else {
                                  startEditing(item);
                                }
                              }
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider border rounded-lg transition-all cursor-pointer shadow-3xs hover:shadow-2xs active:scale-95 text-center font-sans shrink-0 ${
                              isConfigLocked && !isAdmin
                                ? "text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed"
                                : isEditing
                                  ? "text-rose-750 bg-rose-50 border-rose-200 hover:bg-rose-100"
                                  : "text-amber-750 bg-amber-50 hover:bg-amber-600 hover:text-white border-amber-100"
                            }`}
                            title="Sửa nhanh quy tắc"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>{isEditing ? "Hủy" : "Sửa nhanh"}</span>
                          </button>
                        </div>
                      </td>

                    </motion.tr>

                    {/* Inline CSS selector config drawer */}
                    {isEditing && (
                      <tr className="bg-slate-50/50 border-y border-indigo-105">
                        <td colSpan={4} className="p-4 font-sans">
                          <div className="bg-white border border-indigo-100 rounded-xl p-4 shadow-sm space-y-4 animate-fade-in">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                <Wrench className="w-4 h-4 text-indigo-600" />
                                Custom CSS Rule Builder tại chỗ
                              </span>
                              <span className="font-mono text-slate-400 text-[10px]">
                                Domain: <strong className="text-indigo-600 font-bold bg-slate-50 border border-slate-200/60 px-1 ml-0.5 rounded">{item.cleanDomain}</strong>
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Name input */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-450">
                                  Tên nguồn tin tức / Website
                                </label>
                                <input
                                  type="text"
                                  value={editFormName}
                                  onChange={(e) => setEditFormName(e.target.value)}
                                  placeholder="Ví dụ: Báo Tuổi Trẻ, VNExpress..."
                                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-lg outline-none transition-all shadow-3xs font-medium"
                                />
                              </div>

                              {/* Queries comma-separated input */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-450">
                                  CSS Selector Queries (ngăn cách bởi dấu phẩy)
                                </label>
                                <input
                                  type="text"
                                  value={editFormQueries}
                                  onChange={(e) => setEditFormQueries(e.target.value)}
                                  placeholder="Ví dụ: article h1, p.lead, p.normal"
                                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-lg outline-none transition-all shadow-3xs font-mono font-medium"
                                />
                              </div>
                            </div>

                            {/* Help tips description */}
                            <div className="text-[10.5px] text-slate-500 bg-indigo-50/50 border border-indigo-100/70 p-2.5 rounded-lg leading-relaxed flex items-start gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5 animate-pulse" />
                              <div>
                                <span className="font-bold text-slate-700">Mẹo thiết lập nhanh:</span> Nhập các quy tắc selector để hệ thống lọc dữ liệu chính xác. Bạn có khai báo nhiều quy tắc ngăn cách bởi dấu phẩy. Toàn bộ thay đổi sẽ tự động chuẩn hóa và lưu trực tiếp lên cấu hình JSON tổng thể tức thì.
                              </div>
                            </div>

                            {/* Actions footer */}
                            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                              <button
                                type="button"
                                onClick={() => setEditingRowId(null)}
                                className="px-3.5 py-1.5 rounded-lg text-[10.5px] font-extrabold uppercase tracking-wider text-slate-600 hover:bg-slate-100 border border-slate-250 cursor-pointer transition-colors"
                              >
                                Thoát
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveConfig(item)}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10.5px] font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 shadow-3xs cursor-pointer transition-all"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>Cập nhật cấu hình</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination & Footer controls block */}
      <div className="px-5 py-4 bg-slate-100 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 text-[11.5px] font-sans">
        
        {/* Left Hand Column: Item indexes representation and page size dropdown */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="text-slate-600 font-medium">
            {activeTab === "duplicates" ? (
              <span>
                Hiển thị từ <strong className="text-slate-900 font-extrabold">{itemStart}</strong> - <strong className="text-slate-900 font-extrabold">{itemEnd}</strong> trên tổng <strong className="text-slate-900 font-extrabold">{totalItemsCount}</strong> nhóm lặp trùng.
              </span>
            ) : (
              <span>
                Hiển thị từ <strong className="text-slate-900 font-extrabold">{itemStart}</strong> - <strong className="text-slate-900 font-extrabold">{itemEnd}</strong> trên tổng <strong className="text-slate-900 font-extrabold">{totalItemsCount}</strong> dòng lọc ({matchedWhitelist.length} gốc).
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Số dòng:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-xs text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold transition-all cursor-pointer shadow-3xs"
            >
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="30">30</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span className="text-[10px] text-slate-400 italic">/ trang</span>
          </div>
        </div>

        {/* Right Hand Column: Responsive Page numbers selector list */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-center sm:justify-end">
            {/* Prev Trigger Button */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`p-1.5 rounded-lg border transition-all inline-flex items-center justify-center cursor-pointer ${
                currentPage === 1
                  ? "border-slate-200 text-slate-300 bg-slate-50/50 cursor-not-allowed"
                  : "border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300 active:scale-95 shadow-3xs"
              }`}
              title="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Sliding Pagination Button controls list */}
            <div className="flex items-center gap-1">
              {getPageNumbers().map((num, idx) => {
                if (num === "...") {
                  return (
                    <span 
                      key={`ellipsis-${idx}`} 
                      className="px-2 text-slate-400 font-extrabold tracking-widest text-[10px]"
                    >
                      ...
                    </span>
                  );
                }
                
                const isCurrent = currentPage === num;
                return (
                  <button
                    key={`page-${num}`}
                    onClick={() => setCurrentPage(num as number)}
                    className={`min-w-[28px] h-7 text-xs font-black rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                      isCurrent
                        ? "bg-indigo-600 text-white shadow-xs border border-indigo-700 scale-102"
                        : "bg-white text-slate-650 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:scale-95 shadow-3xs"
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>

            {/* Next Trigger Button */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`p-1.5 rounded-lg border transition-all inline-flex items-center justify-center cursor-pointer ${
                currentPage === totalPages
                  ? "border-slate-200 text-slate-300 bg-slate-50/50 cursor-not-allowed"
                  : "border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300 active:scale-95 shadow-3xs"
              }`}
              title="Trang sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>

      {/* Detail Modal Component */}
      <AnimatePresence>
        {selectedDetailItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-3xs z-50 flex items-center justify-center p-4 font-sans"
            onClick={() => setSelectedDetailItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.35 }}
              className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header section of the modal */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 block shadow-3xs">
                    <FileCode className="w-5 h-5" />
                  </span>
                  <div>
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Chi tiết cấu hình tên miền</h2>
                    <p className="text-[10px] text-slate-500 font-mono italic">ID: {selectedDetailItem.id}</p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setSelectedDetailItem(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer text-slate-400 hover:text-slate-700 bg-white border border-slate-200/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable details contents */}
              <div className="p-5 overflow-y-auto space-y-5 flex-1 col-span-1">
                
                {/* Visual Overview grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name Card */}
                  <div className="p-4 rounded-xl border border-slate-200/60 bg-slate-50/50 space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-sans">
                      Tên miền whitelist gốc:
                    </span>
                    <div className="flex items-center justify-between gap-2 pt-1 font-mono">
                      <span className="text-xs font-black text-slate-850 truncate">{selectedDetailItem.originalText}</span>
                      <button
                        type="button"
                        onClick={() => handleCopySingle(`detail-orig-${selectedDetailItem.id}`, selectedDetailItem.originalText)}
                        className="p-1 rounded hover:bg-slate-200 transition-all inline-flex text-slate-400 hover:text-slate-700 bg-white border border-slate-200/50 cursor-pointer shadow-3xs shrink-0"
                        title="Sao chép tên miền gốc"
                      >
                        {copiedItemMap[`detail-orig-${selectedDetailItem.id}`] ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    {selectedDetailItem.originalText.toLowerCase() !== selectedDetailItem.cleanDomain && (
                      <div className="text-[10px] text-indigo-650 pt-1 font-sans flex items-center gap-1">
                        <CornerDownRight className="w-3 h-3 text-indigo-400" />
                        <span>Chuẩn hóa: <strong>{selectedDetailItem.cleanDomain}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Config Status Card */}
                  <div className="p-4 rounded-xl border border-slate-200/60 bg-slate-50/50 flex flex-col justify-center space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-sans">
                      Trạng thái tích hợp:
                    </span>
                    <div className="pt-1.5">
                      {selectedDetailItem.isMatched ? (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-800 border border-emerald-200 shadow-3xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          Đã cấu hình JSON
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-rose-800 border border-rose-200 shadow-3xs">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                          Chưa có luật thu nạp
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Main dynamic section based on Configuration Match */}
                {selectedDetailItem.isMatched && selectedDetailItem.matchedItem ? (
                  <div className="space-y-4 font-sans">
                    
                    {/* Selectors details */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-widest block flex items-center gap-1">
                          <Code className="w-4 h-4 text-indigo-550" />
                          <span>Quy tắc Selectors được gán ({selectedDetailItem.matchedItem.css_queries?.length || 0})</span>
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => {
                            const selectors = selectedDetailItem.matchedItem?.css_queries;
                            const textToCopy = Array.isArray(selectors) ? selectors.join(", ") : String(selectors || "");
                            handleCopySingle(`all-sel-${selectedDetailItem.id}`, textToCopy);
                          }}
                          className="text-[10px] text-indigo-700 hover:text-indigo-800 font-bold transition-all bg-indigo-50 hover:bg-indigo-105 px-2 py-1 rounded-lg border border-indigo-150 inline-flex items-center gap-1 cursor-pointer"
                        >
                          {copiedItemMap[`all-sel-${selectedDetailItem.id}`] ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Đã sao chép tất cả!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Sao chép chuỗi selector</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Display as beautifully list code elements */}
                      <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-2 max-h-[220px] overflow-y-auto">
                        {selectedDetailItem.matchedItem.css_queries && Array.isArray(selectedDetailItem.matchedItem.css_queries) && selectedDetailItem.matchedItem.css_queries.length > 0 ? (
                          selectedDetailItem.matchedItem.css_queries.map((q, qIndex) => {
                            const selectorStr = q && typeof q === 'object'
                              ? (q.selector || q.query || q.css_query || JSON.stringify(q))
                              : String(q);
                            
                            const isSpecificCopied = !!copiedItemMap[`modal-spec-${selectedDetailItem.id}-${qIndex}`];
                            return (
                              <div key={qIndex} className="flex items-center justify-between gap-4 py-1.5 border-b border-slate-800/80 last:border-0 group">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-[9px] font-mono font-bold bg-slate-800 text-slate-450 px-1.5 py-0.5 rounded tracking-wide shrink-0">
                                    Quy tắc #{qIndex + 1}
                                  </span>
                                  <code className="text-xs font-mono font-bold text-emerald-400 truncate tracking-wide">
                                    {selectorStr}
                                  </code>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopySingle(`modal-spec-${selectedDetailItem.id}-${qIndex}`, selectorStr)}
                                  className="text-slate-500 hover:text-white transition-colors p-1 rounded hover:bg-slate-800 cursor-pointer"
                                  title="Sao chép Quy tắc này"
                                >
                                  {isSpecificCopied ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-4 text-slate-500 italic text-xs">
                            Cấu hình trống hoặc chưa chứa selectors con
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Developer JSON Payload Collapse block */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-slate-450 uppercase tracking-widest block">
                          Toàn bộ payload cấu hình trong JSON:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const rawJson = JSON.stringify(selectedDetailItem.matchedItem, null, 2);
                            handleCopySingle(`raw-json-${selectedDetailItem.id}`, rawJson);
                          }}
                          className="text-[10px] text-slate-655 hover:text-slate-800 font-bold transition-all bg-slate-100 hover:bg-slate-150 px-2 py-1 rounded-lg border border-slate-205 inline-flex items-center gap-1 cursor-pointer"
                        >
                          {copiedItemMap[`raw-json-${selectedDetailItem.id}`] ? (
                            <>
                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                              <span>Đã sao chép!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-2.5 h-2.5" />
                              <span>Copy Block JSON</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl overflow-x-auto text-[10.5px] font-mono text-slate-700 leading-relaxed max-h-[160px] overflow-y-auto">
                        {JSON.stringify(selectedDetailItem.matchedItem, null, 2)}
                      </pre>
                    </div>

                  </div>
                ) : (
                  <div className="space-y-4 font-sans">
                    
                    {/* Unconfigured Alert details */}
                    <div className="p-4 rounded-xl border border-rose-150 bg-rose-50/50 flex gap-3 text-rose-800">
                      <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold uppercase tracking-wider">Hệ thống chưa có tệp JSON cấu hình thu nạp</h4>
                        <p className="text-[11px] text-rose-700 leading-relaxed">
                          Tên miền này đã xuất hiện trong Whitelist của bạn nhưng chưa có cấu hình tương thích trong bộ lọc JSON Crawler ở trên. Các bot crawler sẽ bỏ qua phân tích hoặc sử dụng bộ quy chuẩn mặc định.
                        </p>
                      </div>
                    </div>

                    {/* Template tool container to speed up workflow */}
                    <div className="p-4.5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <PlusCircle className="w-4 h-4 text-indigo-600" />
                          <span>Sử dụng mẫu cấu hình nhanh cho miền này</span>
                        </h4>
                        <p className="text-[10.5px] text-slate-550">
                          Sao chép bản mẫu JSON dưới đây để bổ sung trực tiếp vào danh sách mảng cấu hình JSON ở công cụ phía trên nhằm hợp lệ hoá và cấp phép thu nạp nhanh.
                        </p>
                      </div>

                      {/* Displaying generated template */}
                      <div className="relative group">
                        <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto text-[10.5px] font-mono text-emerald-400 select-all leading-relaxed">
                          {`{
  "domain": "${selectedDetailItem.cleanDomain}",
  "name": "Báo chí ${selectedDetailItem.cleanDomain.split('.')[0].toUpperCase()}",
  "css_queries": [
    "h1.title-detail",
    "div.article-content"
  ]
}`}
                        </pre>
                        
                        <button
                          type="button"
                          onClick={() => {
                            const templateCode = `{
  "domain": "${selectedDetailItem.cleanDomain}",
  "name": "Báo chí ${selectedDetailItem.cleanDomain.split('.')[0].toUpperCase()}",
  "css_queries": [
    "h1.title-detail",
    "div.article-content"
  ]
}`;
                            handleCopySingle(`tpl-mod-${selectedDetailItem.id}`, templateCode);
                          }}
                          className="absolute right-2.5 top-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-bold p-1.5 rounded border border-slate-700 transition-all inline-flex text-xs cursor-pointer shadow-md"
                          title="Sao chép mẫu cấu hình nhanh"
                        >
                          {copiedItemMap[`tpl-mod-${selectedDetailItem.id}`] ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="pt-1.5 flex items-center gap-1 text-[10px] text-slate-400 italic font-mono">
                        <span>💡 Hướng dẫn: Khai báo đầy đủ giúp bot Sentinel thu hoạch nội dung chính xác.</span>
                      </div>
                    </div>

                  </div>
                )}

              </div>

              {/* Secure footer action inside modal */}
              <div className="p-4.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedDetailItem(null)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-705 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer active:scale-97 text-center shadow-3xs"
                >
                  Đóng lại
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
