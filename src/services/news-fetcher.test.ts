/**
 * Tests for news-fetcher.ts
 *
 * Run:  npx tsx --test src/services/news-fetcher.test.ts
 *
 * Uses Node.js built-in test runner (node:test) — no extra framework needed.
 * Network is mocked via globalThis.fetch replacement to keep tests hermetic.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

// ─── Mock helpers ─────────────────────────────────────────────────────────────

type FetchHandler = (url: string) => Response;

function mockFetch(handler: FetchHandler) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).fetch = (_url: string, _opts?: unknown) =>
    Promise.resolve(handler(_url));
}

function restoreFetch(original: typeof globalThis.fetch) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).fetch = original;
}

// ─── Shared mock responses ────────────────────────────────────────────────────

// CryptoCompare response shape: { Data: CryptoCompareArticle[] }
const MOCK_CRYPTOCOMPARE = JSON.stringify({
  Data: [
    {
      title: "Bitcoin hits new all-time high",
      published_on: 1752624000, // Unix timestamp
      url: "https://example.com/1",
      source_info: { name: "CoinDesk" },
      tags: "BTC|Trading",
      categories: "Market",
    },
    {
      title: "Vietnam crypto tax policy update 2026",
      published_on: 1752620400,
      url: "https://example.com/2",
      source_info: { name: "VnExpress" },
      tags: "",
      categories: "Regulation",
    },
  ],
});

const MOCK_FEAR_GREED = JSON.stringify({
  data: [
    {
      value: "72",
      value_classification: "Greed",
      timestamp: "1752624000",
    },
  ],
});

const MOCK_REUTERS_RSS = `<?xml version="1.0"?>
<rss><channel>
  <item><title>Fed keeps rates unchanged</title><pubDate>Wed, 16 Jul 2026 05:00:00 +0000</pubDate><link>https://reuters.com/1</link></item>
  <item><title>Oil prices drop on supply data</title><pubDate>Wed, 16 Jul 2026 04:30:00 +0000</pubDate><link>https://reuters.com/2</link></item>
</channel></rss>`;

function happyPathHandler(url: string): Response {
  if (url.includes("cryptocompare.com"))
    return new Response(MOCK_CRYPTOCOMPARE, {
      headers: { "Content-Type": "application/json" },
    });
  if (url.includes("alternative.me"))
    return new Response(MOCK_FEAR_GREED, {
      headers: { "Content-Type": "application/json" },
    });
  if (url.includes("reuters.com"))
    return new Response(MOCK_REUTERS_RSS, {
      headers: { "Content-Type": "application/rss+xml" },
    });
  return new Response("not found", { status: 404 });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getNewsSnapshot — shape", async () => {
  const originalFetch = globalThis.fetch;

  before(() => mockFetch(happyPathHandler));
  after(() => restoreFetch(originalFetch));

  it("returns an object with the expected keys", async () => {
    const { getNewsSnapshot } = await import("./news-fetcher.js");
    const snap = await getNewsSnapshot();
    assert.ok(
      Array.isArray(snap.cryptoHeadlines),
      "cryptoHeadlines must be array",
    );
    assert.ok(
      Array.isArray(snap.macroHeadlines),
      "macroHeadlines must be array",
    );
    assert.ok(
      typeof snap.vietnamRegulatoryContext === "string",
      "regulatoryContext must be string",
    );
    assert.ok(typeof snap.fetchedAt === "string", "fetchedAt must be string");
  });

  it("Fear & Greed is non-null on success and has correct value", async () => {
    const { getNewsSnapshot } = await import("./news-fetcher.js");
    const snap = await getNewsSnapshot();
    assert.ok(snap.fearGreed !== null, "fearGreed should be populated");
    assert.equal(snap.fearGreed?.value, 72);
    assert.equal(snap.fearGreed?.valueText, "Greed");
  });

  it("crypto headlines parsed from CryptoCompare Data array", async () => {
    const { getNewsSnapshot } = await import("./news-fetcher.js");
    const snap = await getNewsSnapshot();
    assert.ok(snap.cryptoHeadlines.length > 0, "should have crypto headlines");
    assert.ok(
      snap.cryptoHeadlines.some((h) => h.title.includes("Bitcoin")),
      "should include Bitcoin headline",
    );
  });

  it("tags are parsed from pipe-separated string into array", async () => {
    const { getNewsSnapshot } = await import("./news-fetcher.js");
    const snap = await getNewsSnapshot();
    const btcItem = snap.cryptoHeadlines.find((h) => h.title.includes("Bitcoin"));
    assert.ok(btcItem?.currencies?.includes("BTC"), "BTC tag should be parsed");
  });

  it("Vietnam regulatory context contains static block", async () => {
    const { getNewsSnapshot } = await import("./news-fetcher.js");
    const snap = await getNewsSnapshot();
    assert.ok(
      snap.vietnamRegulatoryContext.includes("Nghị quyết"),
      "must include static regulatory context",
    );
  });
});

describe("getNewsContext — formatted string", async () => {
  const originalFetch = globalThis.fetch;

  before(() => mockFetch(happyPathHandler));
  after(() => restoreFetch(originalFetch));

  it("returns a non-empty string", async () => {
    const { getNewsContext } = await import("./news-fetcher.js");
    const ctx = await getNewsContext();
    assert.ok(
      typeof ctx === "string" && ctx.length > 0,
      "context must be non-empty string",
    );
  });

  it("mentions Fear & Greed index", async () => {
    const { getNewsContext } = await import("./news-fetcher.js");
    const ctx = await getNewsContext();
    assert.ok(
      ctx.includes("Fear & Greed") ||
        ctx.includes("TÂM LÝ") ||
        ctx.includes("CHỈ SỐ"),
      "should mention sentiment index",
    );
  });

  it("includes a Bitcoin headline from CryptoCompare", async () => {
    const { getNewsContext } = await import("./news-fetcher.js");
    const ctx = await getNewsContext();
    assert.ok(ctx.includes("Bitcoin"), "should include Bitcoin headline");
  });

  it("includes macro section when Reuters returns data", async () => {
    const { getNewsContext } = await import("./news-fetcher.js");
    const ctx = await getNewsContext();
    assert.ok(
      ctx.includes("Fed keeps rates") || ctx.includes("VĨ MÔ"),
      "should include macro news",
    );
  });
});

describe("getNewsContext — graceful degradation on API errors", async () => {
  const originalFetch = globalThis.fetch;

  before(() =>
    mockFetch((_url) => new Response("error", { status: 500 })),
  );
  after(() => restoreFetch(originalFetch));

  it("returns string without throwing when all APIs fail", async () => {
    const { getNewsContext } = await import("./news-fetcher.js");
    let ctx: string | undefined;
    await assert.doesNotReject(async () => {
      ctx = await getNewsContext();
    }, "getNewsContext must not throw on API failures");
    assert.ok(typeof ctx === "string", "should return string even on failure");
  });
});
