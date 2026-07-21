/**
 * Market data service — fetches live crypto prices from Binance public API.
 * Used as a "finance agent" to enrich content generation context with real-time data.
 */

interface BinanceTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  lastPrice: string;
  volume: string;
  quoteVolume: string;
}

interface MarketSummary {
  btcPrice: number;
  btcChange24h: number;
  ethPrice: number;
  ethChange24h: number;
  topGainers: { name: string; symbol: string; price: number; change: number }[];
  topLosers: { name: string; symbol: string; price: number; change: number }[];
  totalMarketCap: number;
  totalVolume: number;
  fetchedAt: string;
}

const BINANCE_BASE = "https://api.binance.com/api/v3";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedSummary: MarketSummary | null = null;
let cacheTimestamp = 0;

/**
 * Fetch all USDT trading pairs from Binance.
 */
async function fetchAllTickers(): Promise<BinanceTicker[]> {
  const url = `${BINANCE_BASE}/ticker/24hr`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`Binance API error: ${res.status} ${res.statusText}`);
  }

  const allTickers = (await res.json()) as BinanceTicker[];
  return allTickers.filter((t) => t.symbol.endsWith("USDT"));
}

/**
 * Build a structured market summary from raw ticker data.
 */
function buildSummary(tickers: BinanceTicker[]): MarketSummary {
  const btc = tickers.find((t) => t.symbol === "BTCUSDT");
  const eth = tickers.find((t) => t.symbol === "ETHUSDT");

  const parsed = tickers
    .map((t) => ({
      symbol: t.symbol.replace("USDT", ""),
      price: parseFloat(t.lastPrice),
      change: parseFloat(t.priceChangePercent),
      volume: parseFloat(t.quoteVolume),
    }))
    .filter((t) => !isNaN(t.change) && t.price > 0);

  const gainers = [...parsed].sort((a, b) => b.change - a.change);
  const losers = [...parsed].sort((a, b) => a.change - b.change);

  const totalVolume = parsed.reduce((sum, t) => sum + t.volume, 0);

  return {
    btcPrice: btc ? parseFloat(btc.lastPrice) : 0,
    btcChange24h: btc ? parseFloat(btc.priceChangePercent) : 0,
    ethPrice: eth ? parseFloat(eth.lastPrice) : 0,
    ethChange24h: eth ? parseFloat(eth.priceChangePercent) : 0,
    topGainers: gainers.slice(0, 3).map((t) => ({
      name: t.symbol,
      symbol: t.symbol,
      price: t.price,
      change: t.change,
    })),
    topLosers: losers.slice(0, 3).map((t) => ({
      name: t.symbol,
      symbol: t.symbol,
      price: t.price,
      change: t.change,
    })),
    totalMarketCap: 0, // Binance doesn't provide market cap data
    totalVolume,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Format a number for display: $67,234.12 or 12.3%.
 */
function fmtPrice(n: number): string {
  if (n >= 1) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${n.toPrecision(4)}`;
}

function fmtBigNumber(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString("en-US")}`;
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

/**
 * Get the market summary, using cache if fresh enough.
 */
export async function getMarketSummary(): Promise<MarketSummary> {
  const now = Date.now();
  if (cachedSummary && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedSummary;
  }

  const tickers = await fetchAllTickers();
  cachedSummary = buildSummary(tickers);
  cacheTimestamp = now;
  return cachedSummary;
}

/**
 * Format the market summary as a human-readable text block for injection into prompts.
 * This is the main export used by the content generator.
 */
export async function getMarketContext(): Promise<string> {
  try {
    const summary = await getMarketSummary();

    const lines: string[] = [
      `📊 DỮ LIỆU THỊ TRƯỜNG CRYPTO (cập nhật lúc ${new Date(summary.fetchedAt).toLocaleString("vi-VN")}):`,
      ``,
      `Bitcoin (BTC): ${fmtPrice(summary.btcPrice)} (${fmtChange(summary.btcChange24h)} 24h)`,
      `Ethereum (ETH): ${fmtPrice(summary.ethPrice)} (${fmtChange(summary.ethChange24h)} 24h)`,
      ``,
      `🔺 Top tăng giá mạnh nhất 24h:`,
      ...summary.topGainers.map((c) => `  • ${c.name} (${c.symbol}): ${fmtPrice(c.price)} (${fmtChange(c.change)})`),
      ``,
      `🔻 Top giảm giá mạnh nhất 24h:`,
      ...summary.topLosers.map((c) => `  • ${c.name} (${c.symbol}): ${fmtPrice(c.price)} (${fmtChange(c.change)})`),
      ``,
      `Tổng vốn hóa thị trường: ${fmtBigNumber(summary.totalMarketCap)}`,
      `Tổng khối lượng giao dịch 24h: ${fmtBigNumber(summary.totalVolume)}`,
    ];

    return lines.join("\n");
  } catch (err) {
    console.warn("[MarketData] Failed to fetch market data, using fallback:", (err as Error).message);
    return `📊 DỮ LIỆU THỊ TRƯỜNG CRYPTO (cập nhật lúc ${new Date().toLocaleString("vi-VN")}):\n[Không thể tải dữ liệu thị trường thời gian thực. Hãy viết bài dựa trên kiến thức chung về thị trường crypto.]`;
  }
}

/**
 * Get current date context in Vietnamese format.
 */
export function getDateContext(): string {
  const now = new Date();
  return `📅 Hôm nay là ${now.toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}, lúc ${now.toLocaleTimeString("vi-VN")}.`;
}
