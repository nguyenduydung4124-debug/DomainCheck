import { CrawlerItem, WhitelistItem, DuplicateGroup } from "./types";

/**
 * Normalizes a domain by:
 * 1. Dropping leading/trailing spaces
 * 2. Translating to lowercase
 * 3. Stripping out http://, https://, and ftp://
 * 4. Optionally stripping leading 'www.' if "smart mode" is active
 * 5. Stripping trailing slash and path components (e.g. "domain.com/path?query" -> "domain.com")
 */
export function normalizeDomain(domainStr: string, smartMode: boolean = true): string {
  if (!domainStr) return "";
  
  let clean = domainStr.trim().toLowerCase();
  
  // Remove protocols
  clean = clean.replace(/^(https?:\/\/)?(ftp:\/\/)?/i, "");
  
  // Remove trailing slashes or subpaths
  const slashIndex = clean.indexOf("/");
  if (slashIndex !== -1) {
    clean = clean.substring(0, slashIndex);
  }
  
  // Strip www. if requested
  if (smartMode && clean.startsWith("www.")) {
    clean = clean.substring(4);
  }
  
  return clean.trim();
}

/**
 * Processes the crawler JSON string into an array of CrawlerItem
 */
export function parseCrawlerJson(rawJson: string): { items: CrawlerItem[]; error: string | null } {
  if (!rawJson.trim()) {
    return { items: [], error: null };
  }
  
  try {
    const parsed = JSON.parse(rawJson);
    
    if (Array.isArray(parsed)) {
      // Validate array elements
      const validItems = parsed.filter(item => {
        return item && typeof item === "object";
      });
      return { items: validItems, error: null };
    } else if (parsed && typeof parsed === "object") {
      // If user pasted a single object, wrap it in an array
      if (parsed.domain) {
        return { items: [parsed], error: "Lưu ý: Dữ liệu JSON được định dạng dưới dạng một đối tượng duy nhất thay vì một danh sách, hệ thống đã chuẩn hóa tự động." };
      }
      
      // Look for common list fields in nested properties
      for (const key of Object.keys(parsed)) {
        if (Array.isArray(parsed[key])) {
          const validItems = parsed[key].filter((item: any) => item && typeof item === "object");
          if (validItems.length > 0) {
            return {
              items: validItems,
              error: `Chú ý: Đã tìm thấy danh sách cấu hình nằm trong thuộc tính "${key}" của tệp JSON.`
            };
          }
        }
      }
      
      return { items: [], error: "Lỗi định dạng cấu trúc: JSON là đối tượng nhưng không có trường 'domain' hợp lệ hay danh sách con." };
    }
    
    return { items: [], error: "Lỗi định dạng: JSON phải là một mảng danh sách tên miền." };
  } catch (err: any) {
    return { items: [], error: `Lỗi phân tích cú pháp JSON: ${err.message}` };
  }
}

/**
 * Parses domain Whitelist list strings (handles comma-separated, semicolon, multi-line, or CSV columns)
 */
export function parseWhitelist(rawText: string, smartMode: boolean = true): WhitelistItem[] {
  if (!rawText.trim()) return [];
  
  // Try to split check if it looks like a typical CSV (comma/semicolon and headers)
  const lines = rawText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length === 0) return [];
  
  const parsedDomains: { original: string; domain: string }[] = [];
  
  // Check if first line contains header titles like "domain", "name", "tên miền" to ignore/map
  let headerIndex = -1;
  const firstLine = lines[0];
  const columns = firstLine.split(/[,;\t]/).map(c => c.trim().toLowerCase());
  
  // Search if we can identify column index representing the domain name
  const domainHeaders = ["domain", "domain name", "tên miền", "ten mien", "name", "tên", "url", "website"];
  for (let i = 0; i < columns.length; i++) {
    if (domainHeaders.includes(columns[i])) {
      headerIndex = i;
      break;
    }
  }
  
  // If we detected a valid index, we parse from index column, discarding the header row unless it's a real domain itself
  let startIdx = 0;
  if (headerIndex !== -1 && lines.length > 1) {
    startIdx = 1; // Skip header row
  }
  
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    
    // Split columns
    const cols = line.split(/[,;\t]/).map(c => c.trim());
    
    if (cols.length > 1) {
      // It is a CSV line or compound properties
      let candidate = "";
      if (headerIndex !== -1 && cols[headerIndex]) {
        candidate = cols[headerIndex];
      } else {
        // Fallback: take the first column that resembles a domain
        const found = cols.find(c => c.includes(".") && !c.includes(" ") && c.length > 3);
        candidate = found || cols[0];
      }
      
      if (candidate) {
        parsedDomains.push({
          original: line,
          domain: normalizeDomain(candidate, smartMode)
        });
      }
    } else {
      // Simply raw text line
      parsedDomains.push({
        original: line,
        domain: normalizeDomain(line, smartMode)
      });
    }
  }
  
  // Deduplicate whitelist domains while keeping original records
  const seen = new Set<string>();
  const uniqueItems: WhitelistItem[] = [];
  
  parsedDomains.forEach((item, index) => {
    // Skip if empty domain normalized
    if (!item.domain) return;
    
    if (!seen.has(item.domain)) {
      seen.add(item.domain);
      uniqueItems.push({
        id: `whitelist-${index}-${Date.now()}`,
        originalText: item.original,
        cleanDomain: item.domain,
        isMatched: false
      });
    }
  });
  
  return uniqueItems;
}

/**
 * Matches Whitelist item against Crawler Items list
 */
export function performMatching(
  whitelist: WhitelistItem[],
  crawlerItems: CrawlerItem[],
  smartMode: boolean = true
): WhitelistItem[] {
  // Create a map for quick crawler lookup
  const crawlerMap = new Map<string, CrawlerItem>();
  
  crawlerItems.forEach(item => {
    if (item && item.domain) {
      const normalizedCrawlerDomain = normalizeDomain(item.domain, smartMode);
      if (normalizedCrawlerDomain) {
        // Store, or prefer keeping the one with css_queries if there are duplicates
        const existing = crawlerMap.get(normalizedCrawlerDomain);
        if (!existing || (!existing.css_queries && item.css_queries)) {
          crawlerMap.set(normalizedCrawlerDomain, item);
        }
      }
    }
  });
  
  // Reconcile whitelist and tag details
  return whitelist.map(item => {
    const matched = crawlerMap.get(item.cleanDomain);
    return {
      ...item,
      isMatched: !!matched,
      matchedItem: matched
    };
  });
}

/**
 * Identifies duplicate domains in a raw whitelist input block
 */
export function getDuplicateDomains(rawText: string, smartMode: boolean = true): DuplicateGroup[] {
  if (!rawText.trim()) return [];
  
  const lines = rawText.split(/\r?\n/).map(line => line.trim());
  const parsedDomains: { original: string; domain: string; lineNum: number }[] = [];
  
  let headerIndex = -1;
  if (lines.length > 0) {
    const firstLine = lines[0];
    const columns = firstLine.split(/[,;\t]/).map(c => c.trim().toLowerCase());
    const domainHeaders = ["domain", "domain name", "tên miền", "ten mien", "name", "tên", "url", "website"];
    for (let i = 0; i < columns.length; i++) {
      if (domainHeaders.includes(columns[i])) {
        headerIndex = i;
        break;
      }
    }
  }
  
  let startIdx = 0;
  if (headerIndex !== -1 && lines.length > 1) {
    startIdx = 1; // Skip header row
  }
  
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    
    // Split columns
    const cols = line.split(/[,;\t]/).map(c => c.trim());
    
    if (cols.length > 1) {
      let candidate = "";
      if (headerIndex !== -1 && cols[headerIndex]) {
        candidate = cols[headerIndex];
      } else {
        const found = cols.find(c => c.includes(".") && !c.includes(" ") && c.length > 3);
        candidate = found || cols[0];
      }
      
      if (candidate) {
        parsedDomains.push({
          original: line,
          domain: normalizeDomain(candidate, smartMode),
          lineNum: i + 1
        });
      }
    } else {
      parsedDomains.push({
        original: line,
        domain: normalizeDomain(line, smartMode),
        lineNum: i + 1
      });
    }
  }
  
  // Count counts of frequency
  const freqMap = new Map<string, { originalText: string; lineNumber: number }[]>();
  parsedDomains.forEach(item => {
    if (!item.domain) return;
    const list = freqMap.get(item.domain) || [];
    list.push({ originalText: item.original, lineNumber: item.lineNum });
    freqMap.set(item.domain, list);
  });
  
  const duplicates: DuplicateGroup[] = [];
  freqMap.forEach((occurrences, cleanDomain) => {
    if (occurrences.length > 1) {
      duplicates.push({
        cleanDomain,
        count: occurrences.length,
        occurrences
      });
    }
  });
  
  return duplicates;
}

export interface DomainWarning {
  lineNumber: number;
  originalText: string;
  cleanDomain: string;
  code: "PROTOCOL" | "PATH" | "WHITESPACE" | "UPPERCASE" | "EMAIL" | "EMPTY" | "NO_DOT" | "INVALID_CHARS" | "WWW_PREFIX";
  severity: "warning" | "error";
  message: string;
}

/**
 * Validates each separate line inside the whitelist text, identifying formatting glitches or invalid domains.
 */
export function validateWhitelist(rawText: string, smartMode: boolean = true): DomainWarning[] {
  if (!rawText.trim()) return [];
  
  const lines = rawText.split(/\r?\n/).map(line => line.trim());
  const warnings: DomainWarning[] = [];
  
  // Detect if there's a CSV header row
  let headerIndex = -1;
  if (lines.length > 0) {
    const firstLine = lines[0];
    const columns = firstLine.split(/[,;\t]/).map(c => c.trim().toLowerCase());
    const domainHeaders = ["domain", "domain name", "tên miền", "ten mien", "name", "tên", "url", "website"];
    for (let i = 0; i < columns.length; i++) {
      if (domainHeaders.includes(columns[i])) {
        headerIndex = i;
        break;
      }
    }
  }
  
  let startIdx = 0;
  if (headerIndex !== -1 && lines.length > 1) {
    startIdx = 1; // Skip header row from validation
  }
  
  for (let i = startIdx; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue; // Skip completely blank lines
    
    // Check if line contains a comma/semicolon/tab to deal with CSV row
    const cols = rawLine.split(/[,;\t]/).map(c => c.trim());
    let candidate = "";
    
    if (cols.length > 1) {
      if (headerIndex !== -1 && cols[headerIndex]) {
        candidate = cols[headerIndex];
      } else {
        const found = cols.find(c => c.includes(".") && !c.includes(" ") && !c.includes("@") && c.length > 3);
        candidate = found || cols[0];
      }
    } else {
      candidate = rawLine;
    }
    
    const trimmedCandidate = candidate.trim();
    if (!trimmedCandidate) continue;
    
    const cleanDomain = normalizeDomain(trimmedCandidate, smartMode);
    const lineNum = i + 1;
    
    // 1. Check for email addresses
    if (trimmedCandidate.includes("@")) {
      warnings.push({
        lineNumber: lineNum,
        originalText: rawLine,
        cleanDomain,
        code: "EMAIL",
        severity: "error",
        message: "Không phải tên miền: Dòng chứa ký tự '@' thường được định dạng làm email."
      });
      continue;
    }
    
    // 2. Contains protocol
    if (/^(https?:\/\/|ftp:\/\/)/i.test(trimmedCandidate)) {
      warnings.push({
        lineNumber: lineNum,
        originalText: rawLine,
        cleanDomain,
        code: "PROTOCOL",
        severity: "warning",
        message: "Có chứa giao diện giao thức (http/https). Hệ thống tự động gạt bỏ để so sánh."
      });
    }
    
    // 3. WWW prefix
    if (/^www\./i.test(trimmedCandidate) && smartMode) {
      warnings.push({
        lineNumber: lineNum,
        originalText: rawLine,
        cleanDomain,
        code: "WWW_PREFIX",
        severity: "warning",
        message: "Đầu vào chứa tiền tố 'www.'. Sẽ được chuẩn hóa để đối chiếu đồng nhất."
      });
    }
    
    // 4. Checking upper letters
    if (/[A-Z]/.test(trimmedCandidate)) {
      warnings.push({
        lineNumber: lineNum,
        originalText: rawLine,
        cleanDomain,
        code: "UPPERCASE",
        severity: "warning",
        message: "Chứa chữ viết hoa. Phải tuân thủ chuyển về chữ Latin thường trước khi thu nạp."
      });
    }
    
    // 5. Checking extra space paddings
    if (candidate !== trimmedCandidate) {
      warnings.push({
        lineNumber: lineNum,
        originalText: rawLine,
        cleanDomain,
        code: "WHITESPACE",
        severity: "warning",
        message: "Có khoảng cách thừa ở đầu hoặc cuối."
      });
    }
    
    // 6. Checking folder paths (/)
    if (trimmedCandidate.includes("/") && trimmedCandidate.replace(/https?:\/\//i, "").includes("/")) {
      warnings.push({
        lineNumber: lineNum,
        originalText: rawLine,
        cleanDomain,
        code: "PATH",
        severity: "warning",
        message: "Chứa đường dẫn thư mục bài viết (/). Bộ so sánh chỉ yêu cầu Tên miền gốc."
      });
    }
    
    // 7. No Dot separating TLD
    if (!trimmedCandidate.includes(".")) {
      warnings.push({
        lineNumber: lineNum,
        originalText: rawLine,
        cleanDomain,
        code: "NO_DOT",
        severity: "error",
        message: "Thiếu dấu chấm phân lớp Tên miền (ví dụ: '.vn', '.com'). Bản ghi không hợp lệ."
      });
    }
    
    // 8. Checking bad characters (spaces inside, query args, hashtags, commas)
    const hostnamePart = trimmedCandidate.replace(/https?:\/\//i, "").split("/")[0];
    if (/[^a-zA-Z0-9\.\-\:]/.test(hostnamePart)) {
      warnings.push({
        lineNumber: lineNum,
        originalText: rawLine,
        cleanDomain,
        code: "INVALID_CHARS",
        severity: "error",
        message: "Chứa các ký tự đặc biệt không được phép trong Tên miền (Khoảng trắng giữa, dấu hỏi, dấu phẩy...)."
      });
    }
  }
  
  return warnings;
}

/**
 * Auto-corrects and formats the entire whitelist input block into a clean, duplicate-free list of domains
 */
export function autoCleanAndFormatWhitelist(rawText: string, smartMode: boolean = true): string {
  if (!rawText.trim()) return "";
  
  const lines = rawText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  const cleanedSet = new Set<string>();
  
  let headerIndex = -1;
  if (lines.length > 0) {
    const firstLine = lines[0];
    const columns = firstLine.split(/[,;\t]/).map(c => c.trim().toLowerCase());
    const domainHeaders = ["domain", "domain name", "tên miền", "ten mien", "name", "tên", "url", "website"];
    for (let i = 0; i < columns.length; i++) {
      if (domainHeaders.includes(columns[i])) {
        headerIndex = i;
        break;
      }
    }
  }
  
  let startIdx = 0;
  let hasSkippedHeader = false;
  if (headerIndex !== -1 && lines.length > 1) {
    startIdx = 1;
    hasSkippedHeader = true;
  }
  
  for (let i = startIdx; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;
    
    const cols = rawLine.split(/[,;\t]/).map(c => c.trim());
    let candidate = "";
    
    if (cols.length > 1) {
      if (headerIndex !== -1 && cols[headerIndex]) {
        candidate = cols[headerIndex];
      } else {
        const found = cols.find(c => c.includes(".") && !c.includes(" ") && !c.includes("@") && c.length > 3);
        candidate = found || cols[0];
      }
    } else {
      candidate = rawLine;
    }
    
    let clean = candidate.trim().toLowerCase();
    
    // Strip email
    if (clean.includes("@")) {
      const parts = clean.split("@");
      clean = parts.pop() || "";
    }
    
    // Remove protocol prefix
    clean = clean.replace(/^(https?:\/\/)?(ftp:\/\/)?/i, "");
    
    // Strip sub-directory paths
    const slashIdx = clean.indexOf("/");
    if (slashIdx !== -1) {
      clean = clean.substring(0, slashIdx);
    }
    
    // Strip port numbers
    const colonIdx = clean.indexOf(":");
    if (colonIdx !== -1) {
      clean = clean.substring(0, colonIdx);
    }
    
    // Strip URL parameters
    const qIndex = clean.indexOf("?");
    if (qIndex !== -1) {
      clean = clean.substring(0, qIndex);
    }
    
    const hIndex = clean.indexOf("#");
    if (hIndex !== -1) {
      clean = clean.substring(0, hIndex);
    }
    
    // Drop www. prefix if smart mode
    if (smartMode && clean.startsWith("www.")) {
      clean = clean.substring(4);
    }
    
    // Filter and sanitize invalid characters, keeping only letters, numbers, dot, hypers
    clean = clean.replace(/[^a-z0-9\.\-]/g, "");
    
    if (clean && clean.includes(".") && clean.length > 3) {
      cleanedSet.add(clean);
    }
  }
  
  const cleanedList = Array.from(cleanedSet);
  if (hasSkippedHeader && lines[0]) {
    // Re-insert standard formatted header row or direct plain list
    return cleanedList.join("\n");
  }
  
  return cleanedList.join("\n");
}

