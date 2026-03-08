export const SELFIE_ANALYSIS_PROMPT = `You are an expert personal stylist and color analyst. Analyze this photo (which may be a selfie, full-body shot, side profile, or outfit photo) and provide:

1. **12-Type Color Season**: Determine the person's color season from the 12-type system (e.g., Soft Autumn, Deep Winter, Light Spring). Explain your reasoning based on skin undertone, hair color, and eye color.

2. **Face Shape**: Identify the face shape (oval, round, square, heart, oblong, diamond, triangle). Explain what you observe.

3. **Kibbe Body Type** (if a full/partial body shot): Identify the likely Kibbe type (Dramatic, Soft Dramatic, Flamboyant Natural, Natural, Soft Natural, Dramatic Classic, Classic, Soft Classic, Flamboyant Gamine, Gamine, Soft Gamine, Romantic, Theatrical Romantic). If only a face shot, note this and provide a tentative assessment.

4. **Skin Undertone**: Warm, cool, or neutral.

Respond in valid JSON with this structure:
{
  "colorSeason": "string",
  "colorSeasonReasoning": "string",
  "faceShape": "string",
  "faceShapeReasoning": "string",
  "kibbeType": "string or null",
  "kibbeTypeReasoning": "string",
  "skinUndertone": "warm | cool | neutral",
  "undertoneReasoning": "string"
}`;

export const STYLE_PROFILE_PROMPT = `You are an expert personal stylist. Based on the following quiz answers and photo analyses, generate a comprehensive style profile.

Quiz Answers:
{quizData}

Photo Analyses (may include multiple photos — synthesize findings across all of them for the most accurate assessment):
{selfieAnalysis}

Generate a thorough style profile covering:
1. **Style Archetype**: A creative name for their style (e.g., "Modern Minimalist with Streetwear Edge")
2. **Color Recommendations**: Best colors based on their color season, colors to avoid
3. **Fit & Silhouette**: Recommended fits based on body type and Kibbe type
4. **Key Pieces**: 10-15 wardrobe essentials that match their style
5. **Brands to Explore**: 10-15 brands that align with their aesthetic and budget
6. **Style Do's**: 5-7 styling tips specific to them
7. **Style Don'ts**: 5-7 things to avoid
8. **Accessories**: Recommended accessories (watches, bags, jewelry, etc.)

Respond in valid JSON with this structure:
{
  "styleArchetype": "string",
  "archetypeDescription": "string",
  "colorRecommendations": { "best": ["string"], "avoid": ["string"], "neutrals": ["string"] },
  "fitRecommendations": { "tops": "string", "bottoms": "string", "outerwear": "string", "general": "string" },
  "keyPieces": [{ "item": "string", "description": "string", "priority": "essential | recommended | nice-to-have" }],
  "brandsToExplore": [{ "name": "string", "reason": "string", "priceRange": "string" }],
  "styleDos": ["string"],
  "styleDonts": ["string"],
  "accessories": [{ "type": "string", "recommendation": "string" }]
}`;

export const FEED_GENERATION_PROMPT = `You are an expert personal stylist. Based on this user's style profile and their recent feed interactions, suggest 10 specific clothing items they would love.

Style Profile:
{styleProfile}

Recent Hearts (items they loved):
{hearts}

Recent Skips (items they passed on):
{skips}

For each item, provide:
- A specific, real brand and item type (e.g., "A.P.C. Petit New Standard jeans" not just "dark jeans")
- Why it matches their style
- Category (tops, bottoms, shoes, outerwear, accessories, suiting)
- Approximate price range

Respond in valid JSON array:
[{
  "brand": "string",
  "itemName": "string",
  "description": "string",
  "category": "string",
  "priceRange": "string",
  "rationale": "string",
  "searchQuery": "string (what to Google Image search to find this item)"
}]`;

export const OUTFIT_CHECK_PROMPT = `You are an expert personal stylist reviewing someone's outfit. Analyze the outfit photo against their style profile and provide honest, constructive feedback.

Style Profile:
{styleProfile}

Evaluate:
1. **Overall Rating**: 1-10 with brief justification
2. **What's Working**: Specific elements that look great
3. **What Could Improve**: Specific, actionable suggestions
4. **Fit Assessment**: How the clothes fit their body type
5. **Color Harmony**: How the colors work together and with their color season
6. **Swap Suggestions**: 1-3 specific items that would elevate the outfit

Respond in valid JSON:
{
  "rating": number,
  "ratingJustification": "string",
  "whatsWorking": ["string"],
  "improvements": ["string"],
  "fitAssessment": "string",
  "colorHarmony": "string",
  "swapSuggestions": [{ "currentItem": "string", "suggestedSwap": "string", "reason": "string" }]
}`;
