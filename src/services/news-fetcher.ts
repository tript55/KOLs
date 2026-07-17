/**
 * News & Sentiment Fetcher — enriches content generation with:
 *
 * 1. CryptoCompare News API — top crypto/finance news (completely free, no API key required)
 *    Endpoint: https://min-api.cryptocompare.com/data/v2/news
 * 2. Alternative.me Fear & Greed Index — single number summarising market sentiment
 * 3. Vietnam regulatory headlines — static curated knowledge + dynamic VN-tagged news items
 * 4. Global macro brief — lightweight RSS scrape from Reuters Business feed (no key)
 *
 * All fetches run in parallel, are cached for 10 minutes, and degrade gracefully to
 * empty strings on error so a network outage never blocks content generation.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NewsItem {
  title: string;
  source: string;
  publishedAt: string; // ISO string
  url?: string;
  currencies?: string[]; // e.g. ["BTC", "ETH"]
}

export interface FearGreedResult {
  value: number; // 0–100
  valueText: string; // "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed"
  timestamp: string; // ISO string
}

export interface NewsSnapshot {
  cryptoHeadlines: NewsItem[];
  fearGreed: FearGreedResult | null;
  macroHeadlines: NewsItem[];
  vietnamRegulatoryContext: string;
  fetchedAt: string;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let cachedSnapshot: NewsSnapshot | null = null;
let cacheTimestamp = 0;

// ─── CryptoCompare News API ───────────────────────────────────────────────────
// Docs: https://developers.cryptocompare.com/documentation/data-api/news_v1_article_list
// Free tier: no API key required for public news endpoint.

interface CryptoCompareArticle {
  title: string;
  published_on: number; // Unix timestamp (seconds)
  url: string;
  source_info?: { name?: string };
  /** Pipe-separated coin tags e.g. "BTC|ETH|SOL" */
  tags?: string;
  /** Pipe-separated categories e.g. "Market|Regulation" */
  categories?: string;
}

interface CryptoCompareNewsResponse {
  Data?: CryptoCompareArticle[];
  Message?: string;
}

async function fetchCryptoCompareNews(limit = 12): Promise<NewsItem[]> {
  // sortOrder=popular returns engagement-ranked articles (best signal for KOL content)
  const url =
    "https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=popular";

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(
      `CryptoCompare News API error: ${res.status} ${res.statusText}`,
    );
  }

  const data = (await res.json()) as CryptoCompareNewsResponse;
  const articles = data.Data ?? [];

  return articles.slice(0, limit).map((a) => ({
    title: a.title,
    source: a.source_info?.name ?? "CryptoCompare",
    publishedAt: new Date(a.published_on * 1000).toISOString(),
    url: a.url,
    // Parse pipe-separated tags into a clean array
    currencies: a.tags
      ? a.tags
          .split("|")
          .map((t) => t.trim().toUpperCase())
          .filter((t) => t.length > 0 && t.length <= 5) // keep likely ticker symbols
          .slice(0, 5)
      : [],
  }));
}

// ─── Fear & Greed Index ───────────────────────────────────────────────────────

interface FearGreedApiResponse {
  data?: { value: string; value_classification: string; timestamp: string }[];
}

async function fetchFearGreed(): Promise<FearGreedResult | null> {
  const url = "https://api.alternative.me/fng/?limit=1&format=json";

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) {
    throw new Error(`Fear & Greed API error: ${res.status}`);
  }

  const data = (await res.json()) as FearGreedApiResponse;
  const entry = data.data?.[0];
  if (!entry) return null;

  return {
    value: parseInt(entry.value, 10),
    valueText: entry.value_classification,
    timestamp: new Date(parseInt(entry.timestamp, 10) * 1000).toISOString(),
  };
}

// ─── Macro RSS (Reuters) ──────────────────────────────────────────────────────

/**
 * Parse a minimal subset of RSS/Atom XML without pulling in a full parser.
 * Handles both <title> and <title><![CDATA[...]]></title> variants.
 */
function parseRssItems(
  xml: string,
  sourceLabel: string,
  limit = 5,
): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
    const block = match[1] ?? "";

    const titleMatch =
      block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ??
      block.match(/<title>([\s\S]*?)<\/title>/);
    const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const linkMatch =
      block.match(/<link><!\[CDATA\[([\s\S]*?)\]\]><\/link>/) ??
      block.match(/<link>([\s\S]*?)<\/link>/);

    const title = titleMatch?.[1]?.trim();
    if (!title) continue;

    const rawDate = pubDateMatch?.[1]?.trim();
    const publishedAt = rawDate
      ? new Date(rawDate).toISOString()
      : new Date().toISOString();

    items.push({
      title,
      source: sourceLabel,
      publishedAt,
      url: linkMatch?.[1]?.trim(),
    });
  }

  return items;
}

async function fetchMacroNews(limit = 5): Promise<NewsItem[]> {
  // Reuters finance RSS — publicly accessible, no key required
  const rssUrl =
    "https://feeds.reuters.com/reuters/businessNews";

  const res = await fetch(rssUrl, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml",
      "User-Agent": "Mozilla/5.0 (compatible; CryptoKOL/1.0)",
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    throw new Error(`Reuters RSS error: ${res.status}`);
  }

  const xml = await res.text();
  return parseRssItems(xml, "Reuters Business", limit);
}

// ─── Vietnam Regulatory Context ───────────────────────────────────────────────

/**
 * Returns a static curated paragraph describing Vietnam's 2026 crypto regulatory
 * landscape, supplemented by any freshly scraped CryptoPanic items tagged "vi".
 *
 * The static text is updated with each code release; the dynamic part catches
 * breaking government announcements that may appear in news headlines.
 */
function buildVietnamRegulatoryContext(cryptoNews: NewsItem[]): string {
  const staticContext = [
    "=== BỐI CẢNH PHÁP LÝ VIỆT NAM 2026 ===",
    "• Nghị quyết 05/2025/NQ-CP: Chính phủ công nhận tài sản kỹ thuật số (DAA) là hàng hóa hợp pháp.",
    "• Thông tư 32/2026/TT-BTC: Sàn giao dịch phải đăng ký kinh doanh tại Bộ Tài chính (giấy phép sàn).",
    "• Thuế chuyển nhượng 0.1% áp dụng cho mọi lệnh bán tài sản kỹ thuật số từ 01/01/2026.",
    "• VASP (Virtual Asset Service Provider) phải thực hiện KYC/AML theo chuẩn FATF.",
    "• Mức xử phạt vi phạm quảng cáo tài sản số không được cấp phép: 50–200 triệu VNĐ.",
    "• Nhà đầu tư cá nhân chưa cần khai báo thuế thu nhập từ crypto nếu giữ dưới 12 tháng (đang xem xét).",
  ].join("\n");

  // Filter CryptoCompare items that mention Vietnam or regulatory terms
  const vnKeywords = ["vietnam", "việt nam", "sbv", "bộ tài chính", "vasp", "circular", "decree"];
  const vnNews = cryptoNews
    .filter((n) =>
      vnKeywords.some((kw) => n.title.toLowerCase().includes(kw)),
    )
    .slice(0, 3);

  if (vnNews.length === 0) return staticContext;

  const dynamicPart = vnNews
    .map((n) => `• [Tin mới] ${n.title} (${n.source}, ${formatDate(n.publishedAt)})`)
    .join("\n");

  return `${staticContext}\n\n=== TIN TỨC PHÁP LÝ MỚI NHẤT ===\n${dynamicPart}`;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function fearGreedEmoji(value: number): string {
  if (value <= 25) return "😱";
  if (value <= 45) return "😰";
  if (value <= 55) return "😐";
  if (value <= 75) return "😊";
  return "🤑";
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Fetch and cache the full news snapshot.
 * All sub-fetches run in parallel; failures are silenced individually.
 */
export async function getNewsSnapshot(): Promise<NewsSnapshot> {
  const now = Date.now();
  if (cachedSnapshot && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedSnapshot;
  }

  const [cryptoResult, fearGreedResult, macroResult] = await Promise.allSettled(
    [fetchCryptoCompareNews(12), fetchFearGreed(), fetchMacroNews(5)],
  );

  const cryptoHeadlines =
    cryptoResult.status === "fulfilled" ? cryptoResult.value : [];
  const fearGreed =
    fearGreedResult.status === "fulfilled" ? fearGreedResult.value : null;
  const macroHeadlines =
    macroResult.status === "fulfilled" ? macroResult.value : [];

  if (cryptoResult.status === "rejected") {
    console.warn(
      "[NewsFetcher] CryptoCompare News failed:",
      (cryptoResult.reason as Error).message,
    );
  }
  if (fearGreedResult.status === "rejected") {
    console.warn(
      "[NewsFetcher] Fear & Greed failed:",
      (fearGreedResult.reason as Error).message,
    );
  }
  if (macroResult.status === "rejected") {
    console.warn(
      "[NewsFetcher] Reuters RSS failed:",
      (macroResult.reason as Error).message,
    );
  }

  cachedSnapshot = {
    cryptoHeadlines,
    fearGreed,
    macroHeadlines,
    vietnamRegulatoryContext: buildVietnamRegulatoryContext(cryptoHeadlines),
    fetchedAt: new Date().toISOString(),
  };
  cacheTimestamp = now;
  return cachedSnapshot;
}

/**
 * Format the news snapshot as a human-readable text block for injection into prompts.
 */
export async function getNewsContext(): Promise<string> {
  try {
    const snapshot = await getNewsSnapshot();
    const sections: string[] = [];

    // Fear & Greed
    if (snapshot.fearGreed) {
      const fg = snapshot.fearGreed;
      sections.push(
        `📈 CHỈ SỐ SỢ HÃI & THAM LAM (Fear & Greed Index): ${fearGreedEmoji(fg.value)} ${fg.value}/100 — ${fg.valueText}`,
      );
    }

    // Crypto headlines
    if (snapshot.cryptoHeadlines.length > 0) {
      sections.push("📰 TIN TỨC CRYPTO NỔI BẬT:");
      snapshot.cryptoHeadlines.slice(0, 8).forEach((item) => {
        const coins =
          item.currencies && item.currencies.length > 0
            ? ` [${item.currencies.join(", ")}]`
            : "";
        sections.push(
          `  • ${item.title}${coins} — ${item.source} (${formatDate(item.publishedAt)})`,
        );
      });
    }

    // Macro headlines
    if (snapshot.macroHeadlines.length > 0) {
      sections.push("🌍 TIN TỨC VĨ MÔ TOÀN CẦU:");
      snapshot.macroHeadlines.slice(0, 4).forEach((item) => {
        sections.push(
          `  • ${item.title} — ${item.source} (${formatDate(item.publishedAt)})`,
        );
      });
    }

    // Vietnam regulatory
    sections.push(snapshot.vietnamRegulatoryContext);

    return sections.join("\n\n");
  } catch (err) {
    console.warn(
      "[NewsFetcher] getNewsContext failed, using empty fallback:",
      (err as Error).message,
    );
    return "";
  }
}
