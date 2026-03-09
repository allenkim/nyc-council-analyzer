export interface FashionItem {
  id: string;
  filename: string;
  sourceUrl: string;
  source: string;

  // Scraped metadata
  brand?: string;
  name?: string;
  price?: number;
  currency?: string;
  year?: number;
  material?: string;

  // AI-generated metadata
  aiCategory?: string;
  aiDescription?: string;
  aiBrand?: string;
  aiPriceEstimate?: number;
  aiMaterial?: string;
  aiStyle?: string[];
  aiColors?: string[];
  aiGender?: string;
  aiSeason?: string;

  // Housekeeping
  enrichedAt?: string;
  createdAt: string;
}

export interface Catalog {
  items: FashionItem[];
  updatedAt: string;
}

export interface ScrapeResult {
  imageUrl: string;
  productUrl: string;
  brand?: string;
  name?: string;
  price?: number;
  currency?: string;
  material?: string;
}
