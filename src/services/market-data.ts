/**
 * Market data service — fetches live crypto prices from CoinGecko free API.
 * Used as a "finance agent" to enrich content generation context with real-time data.
 */

interface CoinMarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  market_cap: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
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

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedSummary: MarketSummary | null = null;
let cacheTimestamp = 0;

/**
 * Fetch top coins by market cap from CoinGecko.
 */
async function fetchTopCoins(limit = 20): Promise<CoinMarketData[]> {
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`CoinGecko API error: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as CoinMarketData[];
}

/**
 * Build a structured market summary from raw coin data.
 */
function buildSummary(coins: CoinMarketData[]): MarketSummary {
  const btc = coins.find((c) => c.id === "bitcoin");
  const eth = coins.find((c) => c.id === "ethereum");

  const sorted = [...coins].filter((c) => c.price_change_percentage_24h != null);

  const gainers = [...sorted].sort((a, b) => (b.price_change_percentage_24h ?? 0) - (a.price_change_percentage_24h ?? 0));
  const losers = [...sorted].sort((a, b) => (a.price_change_percentage_24h ?? 0) - (b.price_change_percentage_24h ?? 0));

  const totalMarketCap = coins.reduce((sum, c) => sum + (c.market_cap || 0), 0);
  const totalVolume = coins.reduce((sum, c) => sum + (c.total_volume || 0), 0);

  return {
    btcPrice: btc?.current_price ?? 0,
    btcChange24h: btc?.price_change_percentage_24h ?? 0,
    ethPrice: eth?.current_price ?? 0,
    ethChange24h: eth?.price_change_percentage_24h ?? 0,
    topGainers: gainers.slice(0, 3).map((c) => ({
      name: c.name,
      symbol: c.symbol.toUpperCase(),
      price: c.current_price,
      change: c.price_change_percentage_24h ?? 0,
    })),
    topLosers: losers.slice(0, 3).map((c) => ({
      name: c.name,
      symbol: c.symbol.toUpperCase(),
      price: c.current_price,
      change: c.price_change_percentage_24h ?? 0,
    })),
    totalMarketCap,
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

  const coins = await fetchTopCoins();
  cachedSummary = buildSummary(coins);
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
