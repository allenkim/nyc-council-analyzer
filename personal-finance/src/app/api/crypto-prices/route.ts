import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/session";

// Map common tickers to CoinGecko IDs
const TICKER_TO_COINGECKO: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  ADA: "cardano",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  MATIC: "matic-network",
  LINK: "chainlink",
  UNI: "uniswap",
  ATOM: "cosmos",
  XRP: "ripple",
  DOGE: "dogecoin",
  LTC: "litecoin",
};

// Simple in-memory cache (5 min TTL)
let priceCache: { data: Record<string, number>; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tickers = request.nextUrl.searchParams.get("tickers");
  if (!tickers) {
    return NextResponse.json({ error: "tickers parameter required" }, { status: 400 });
  }

  const tickerList = tickers.split(",").map((t) => t.trim().toUpperCase());
  const geckoIds = tickerList
    .map((t) => TICKER_TO_COINGECKO[t])
    .filter(Boolean);

  if (geckoIds.length === 0) {
    return NextResponse.json({ prices: {} });
  }

  // Return cache if fresh
  if (priceCache && Date.now() - priceCache.fetchedAt < CACHE_TTL) {
    const result: Record<string, number> = {};
    for (const ticker of tickerList) {
      const geckoId = TICKER_TO_COINGECKO[ticker];
      if (geckoId && priceCache.data[geckoId]) {
        result[ticker] = priceCache.data[geckoId];
      }
    }
    return NextResponse.json({ prices: result });
  }

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${geckoIds.join(",")}&vs_currencies=usd`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!res.ok) {
      return NextResponse.json({ error: "CoinGecko API error" }, { status: 502 });
    }

    const data = await res.json();

    // Update cache
    const allPrices: Record<string, number> = {};
    for (const [geckoId, priceData] of Object.entries(data)) {
      allPrices[geckoId] = (priceData as { usd: number }).usd;
    }
    priceCache = { data: allPrices, fetchedAt: Date.now() };

    // Map back to tickers
    const result: Record<string, number> = {};
    for (const ticker of tickerList) {
      const geckoId = TICKER_TO_COINGECKO[ticker];
      if (geckoId && allPrices[geckoId]) {
        result[ticker] = allPrices[geckoId];
      }
    }

    return NextResponse.json({ prices: result });
  } catch (error) {
    console.error("Error fetching crypto prices:", error);
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}
