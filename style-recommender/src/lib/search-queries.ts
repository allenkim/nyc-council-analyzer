/**
 * Curated search queries for the daily fashion image scraper.
 * Weighted toward East Asian fashion but includes global styles.
 * Each query should return fashion outfit/item images.
 */

export const FASHION_QUERIES: { query: string; category: string; tags: string }[] = [
  // Korean fashion — heavy weighting
  { query: "korean men fashion outfit 2025", category: "style", tags: "korean,outfit,trend" },
  { query: "korean minimalist men outfit clean", category: "style", tags: "korean,minimalist,clean" },
  { query: "korean streetwear men outfit seoul", category: "style", tags: "korean,streetwear,seoul" },
  { query: "korean smart casual men outfit", category: "style", tags: "korean,smart-casual" },
  { query: "korean city boy fashion men", category: "style", tags: "korean,city-boy,trend" },
  { query: "korean quiet luxury men outfit", category: "style", tags: "korean,quiet-luxury" },
  { query: "korean men oversized outfit layering", category: "style", tags: "korean,oversized,layering" },
  { query: "korean men earth tone outfit", category: "style", tags: "korean,earth-tone,neutral" },
  { query: "korean men monochrome outfit", category: "style", tags: "korean,monochrome,minimal" },
  { query: "seoul street style men fashion", category: "style", tags: "korean,street-style,seoul" },
  { query: "korean men spring outfit", category: "style", tags: "korean,spring,seasonal" },
  { query: "korean men summer outfit linen", category: "style", tags: "korean,summer,linen" },
  { query: "korean men fall outfit layering", category: "style", tags: "korean,fall,layering" },
  { query: "korean men winter outfit coat", category: "style", tags: "korean,winter,coat" },
  { query: "k-fashion men date outfit", category: "style", tags: "korean,date,outfit" },

  // Japanese fashion
  { query: "japanese men fashion outfit 2025", category: "style", tags: "japanese,outfit,trend" },
  { query: "japanese workwear amekaji men outfit", category: "style", tags: "japanese,workwear,amekaji" },
  { query: "japanese techwear men outfit acronym", category: "style", tags: "japanese,techwear" },
  { query: "japanese minimalist men fashion muji", category: "style", tags: "japanese,minimalist" },
  { query: "japanese ivy style men outfit", category: "style", tags: "japanese,ivy,trad" },
  { query: "tokyo street style men fashion", category: "style", tags: "japanese,street-style,tokyo" },
  { query: "japanese avant garde men fashion", category: "style", tags: "japanese,avant-garde" },
  { query: "japanese denim men outfit selvedge", category: "style", tags: "japanese,denim,heritage" },

  // Chinese fashion
  { query: "chinese men fashion outfit modern", category: "style", tags: "chinese,modern,outfit" },
  { query: "shanghai street style men fashion", category: "style", tags: "chinese,street-style,shanghai" },

  // East Asian brands
  { query: "Uniqlo men outfit lookbook", category: "brand", tags: "uniqlo,japanese,basics" },
  { query: "COS men fashion outfit", category: "brand", tags: "cos,minimalist,scandinavian" },
  { query: "Lemaire men fashion outfit", category: "brand", tags: "lemaire,quiet-luxury,french" },
  { query: "Aime Leon Dore men outfit", category: "brand", tags: "ald,streetwear,ivy" },
  { query: "Our Legacy men fashion", category: "brand", tags: "our-legacy,contemporary" },
  { query: "Kapital clothing men outfit", category: "brand", tags: "kapital,japanese,artisan" },
  { query: "Needles men fashion outfit", category: "brand", tags: "needles,japanese,streetwear" },
  { query: "Visvim men outfit fashion", category: "brand", tags: "visvim,japanese,heritage" },
  { query: "Commes des Garcons men fashion", category: "brand", tags: "cdg,japanese,avant-garde" },
  { query: "Issey Miyake men fashion", category: "brand", tags: "issey-miyake,japanese,design" },
  { query: "Undercover Jun Takahashi men", category: "brand", tags: "undercover,japanese,punk" },
  { query: "Sacai men fashion outfit", category: "brand", tags: "sacai,japanese,hybrid" },
  { query: "Ami Paris men fashion outfit", category: "brand", tags: "ami,french,casual" },
  { query: "Acne Studios men outfit", category: "brand", tags: "acne,scandinavian,minimalist" },
  { query: "Stussy men outfit streetwear", category: "brand", tags: "stussy,streetwear,casual" },
  { query: "Nike ACG men outfit techwear", category: "brand", tags: "nike,acg,outdoor,techwear" },
  { query: "New Balance men outfit fashion", category: "brand", tags: "new-balance,sneaker,casual" },

  // Specific items / wardrobe essentials
  { query: "men wool overcoat outfit korean", category: "item", tags: "outerwear,coat,wool" },
  { query: "men bomber jacket outfit asian fashion", category: "item", tags: "outerwear,bomber" },
  { query: "men chore jacket outfit workwear", category: "item", tags: "outerwear,chore-jacket" },
  { query: "men wide leg pants outfit korean", category: "item", tags: "bottoms,wide-leg,korean" },
  { query: "men slim tailored trousers outfit", category: "item", tags: "bottoms,tailored,slim" },
  { query: "men white t-shirt outfit minimal", category: "item", tags: "tops,tshirt,basics" },
  { query: "men oxford shirt outfit smart casual", category: "item", tags: "tops,oxford,smart-casual" },
  { query: "men knit sweater outfit fall", category: "item", tags: "tops,knitwear,sweater" },
  { query: "men leather boots outfit fashion", category: "item", tags: "shoes,boots,leather" },
  { query: "men white sneakers outfit clean", category: "item", tags: "shoes,sneakers,white,clean" },
  { query: "men tote bag outfit fashion", category: "item", tags: "accessories,bag,tote" },
  { query: "men crossbody bag outfit korean", category: "item", tags: "accessories,bag,crossbody" },
  { query: "men silver jewelry outfit minimal", category: "item", tags: "accessories,jewelry,minimal" },

  // Style archetypes / aesthetics
  { query: "men quiet luxury outfit fashion", category: "inspiration", tags: "quiet-luxury,refined" },
  { query: "men dark academia outfit fashion", category: "inspiration", tags: "dark-academia,scholarly" },
  { query: "men old money outfit fashion", category: "inspiration", tags: "old-money,classic" },
  { query: "men gorpcore outfit fashion", category: "inspiration", tags: "gorpcore,outdoor" },
  { query: "men coastal grandmother aesthetic men", category: "inspiration", tags: "coastal,relaxed" },
  { query: "men normcore outfit fashion", category: "inspiration", tags: "normcore,casual" },

  // Color / seasonal
  { query: "men neutral tone outfit fashion", category: "inspiration", tags: "neutral,earth-tone,color" },
  { query: "men all black outfit fashion korean", category: "inspiration", tags: "all-black,monochrome" },
  { query: "men pastel outfit fashion spring", category: "inspiration", tags: "pastel,spring,color" },
  { query: "men jewel tone outfit fashion", category: "inspiration", tags: "jewel-tone,rich,color" },
];

/**
 * Pick N random queries from the list, ensuring category diversity.
 */
export function pickDailyQueries(count: number): typeof FASHION_QUERIES {
  const shuffled = [...FASHION_QUERIES].sort(() => Math.random() - 0.5);
  // Ensure we pick from different categories
  const picked: typeof FASHION_QUERIES = [];
  const categoryCounts: Record<string, number> = {};
  const maxPerCategory = Math.ceil(count / 4); // roughly equal distribution

  for (const q of shuffled) {
    if (picked.length >= count) break;
    const catCount = categoryCounts[q.category] || 0;
    if (catCount < maxPerCategory) {
      picked.push(q);
      categoryCounts[q.category] = catCount + 1;
    }
  }

  // Fill remaining if category limits left gaps
  if (picked.length < count) {
    for (const q of shuffled) {
      if (picked.length >= count) break;
      if (!picked.includes(q)) picked.push(q);
    }
  }

  return picked;
}
