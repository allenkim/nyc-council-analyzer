export type QuizCategory = "body" | "lifestyle" | "preferences" | "style";

export interface QuizQuestion {
  id: string;
  question: string;
  type: "select" | "multiselect" | "text" | "number" | "visual-grid";
  options?: { label: string; value: string; imageQuery?: string }[];
  placeholder?: string;
}

export interface QuizSection {
  category: QuizCategory;
  title: string;
  description: string;
  questions: QuizQuestion[];
}

export const QUIZ_SECTIONS: QuizSection[] = [
  {
    category: "body",
    title: "Body & Fit",
    description: "Help us understand your build and fit preferences.",
    questions: [
      { id: "height", question: "What is your height?", type: "select", options: [
        { label: "Under 5'0\" / Under 152cm", value: "under-5-0" },
        { label: "5'0\"–5'3\" / 152–160cm", value: "5-0-to-5-3" },
        { label: "5'4\"–5'6\" / 163–168cm", value: "5-4-to-5-6" },
        { label: "5'7\"–5'9\" / 170–175cm", value: "5-7-to-5-9" },
        { label: "5'10\"–6'0\" / 178–183cm", value: "5-10-to-6-0" },
        { label: "6'1\"–6'3\" / 185–190cm", value: "6-1-to-6-3" },
        { label: "6'4\"+ / 193cm+", value: "6-4-plus" },
      ]},
      { id: "weight", question: "What is your weight?", type: "select", options: [
        { label: "Under 120 lbs / Under 54kg", value: "under-120" },
        { label: "120–140 lbs / 54–64kg", value: "120-140" },
        { label: "140–160 lbs / 64–73kg", value: "140-160" },
        { label: "160–180 lbs / 73–82kg", value: "160-180" },
        { label: "180–200 lbs / 82–91kg", value: "180-200" },
        { label: "200–220 lbs / 91–100kg", value: "200-220" },
        { label: "220+ lbs / 100kg+", value: "220-plus" },
      ]},
      { id: "bodyType", question: "How would you describe your build?", type: "select", options: [
        { label: "Slim / Lean", value: "slim" },
        { label: "Athletic / Muscular", value: "athletic" },
        { label: "Average", value: "average" },
        { label: "Stocky / Broad", value: "stocky" },
        { label: "Plus-size", value: "plus" },
      ]},
      { id: "preferredFit", question: "What fit do you prefer?", type: "visual-grid", options: [
        { label: "Slim Fit", value: "slim", imageQuery: "korean mens slim fit outfit fashion" },
        { label: "Regular Fit", value: "regular", imageQuery: "japanese mens regular fit outfit fashion" },
        { label: "Relaxed / Oversized", value: "relaxed", imageQuery: "korean mens oversized relaxed fit outfit fashion" },
      ]},
      { id: "topSize", question: "Your typical top size?", type: "select", options: [
        { label: "XS", value: "xs" }, { label: "S", value: "s" }, { label: "M", value: "m" },
        { label: "L", value: "l" }, { label: "XL", value: "xl" }, { label: "XXL", value: "xxl" },
      ]},
      { id: "bottomSize", question: "Your typical bottom size (waist)?", type: "text", placeholder: "e.g., 32" },
      { id: "shoeSize", question: "Your shoe size?", type: "text", placeholder: "e.g., 10 US" },
    ],
  },
  {
    category: "lifestyle",
    title: "Lifestyle & Context",
    description: "Tell us about your daily life and how you dress for it.",
    questions: [
      { id: "occupation", question: "What's your occupation or work environment?", type: "text", placeholder: "e.g., Software engineer, WFH" },
      { id: "dressCode", question: "What's your typical dress code?", type: "select", options: [
        { label: "Very casual (sweats, tees)", value: "very-casual" },
        { label: "Smart casual", value: "smart-casual" },
        { label: "Business casual", value: "business-casual" },
        { label: "Business formal", value: "business-formal" },
        { label: "Mixed / depends on day", value: "mixed" },
      ]},
      { id: "climate", question: "What climate do you live in?", type: "select", options: [
        { label: "Hot year-round", value: "hot" },
        { label: "Warm with mild winters", value: "warm" },
        { label: "Four distinct seasons", value: "four-seasons" },
        { label: "Cold most of the year", value: "cold" },
        { label: "Temperate / moderate", value: "temperate" },
      ]},
      { id: "occasions", question: "What occasions do you typically dress for?", type: "multiselect", options: [
        { label: "Everyday casual", value: "casual" },
        { label: "Work / office", value: "work" },
        { label: "Date nights", value: "dates" },
        { label: "Nights out / bars / clubs", value: "nightlife" },
        { label: "Formal events", value: "formal" },
        { label: "Outdoor / athletic", value: "outdoor" },
        { label: "Travel", value: "travel" },
      ]},
      { id: "activityLevel", question: "How active is your lifestyle?", type: "select", options: [
        { label: "Mostly sedentary", value: "sedentary" },
        { label: "Moderately active", value: "moderate" },
        { label: "Very active / athletic", value: "active" },
      ]},
    ],
  },
  {
    category: "preferences",
    title: "Preferences",
    description: "What colors, patterns, and materials speak to you?",
    questions: [
      { id: "favoriteColors", question: "Pick the colors you're drawn to", type: "multiselect", options: [
        { label: "Black", value: "black" }, { label: "White", value: "white" },
        { label: "Navy", value: "navy" }, { label: "Gray", value: "gray" },
        { label: "Earth tones (tan, olive, brown)", value: "earth" },
        { label: "Pastels", value: "pastels" }, { label: "Bold / bright", value: "bold" },
        { label: "Jewel tones (burgundy, emerald, sapphire)", value: "jewel" },
      ]},
      { id: "avoidColors", question: "Any colors you avoid?", type: "multiselect", options: [
        { label: "Neon / bright", value: "neon" }, { label: "Pastels", value: "pastels" },
        { label: "Orange", value: "orange" }, { label: "Pink", value: "pink" },
        { label: "Yellow", value: "yellow" }, { label: "None — I'm open", value: "none" },
      ]},
      { id: "patterns", question: "Which patterns do you like?", type: "visual-grid", options: [
        { label: "Solid / minimal", value: "solid", imageQuery: "korean minimalist solid color mens outfit" },
        { label: "Stripes", value: "stripes", imageQuery: "japanese striped shirt mens outfit fashion" },
        { label: "Plaid / check", value: "plaid", imageQuery: "korean plaid check mens outfit fashion" },
        { label: "Floral", value: "floral", imageQuery: "japanese floral print mens shirt fashion" },
        { label: "Graphic / print", value: "graphic", imageQuery: "korean graphic tee mens streetwear outfit" },
        { label: "Geometric", value: "geometric", imageQuery: "japanese geometric pattern mens fashion" },
      ]},
      { id: "materials", question: "Materials you love?", type: "multiselect", options: [
        { label: "Cotton", value: "cotton" }, { label: "Linen", value: "linen" },
        { label: "Denim", value: "denim" }, { label: "Wool", value: "wool" },
        { label: "Leather", value: "leather" }, { label: "Cashmere", value: "cashmere" },
        { label: "Technical / athletic", value: "technical" },
      ]},
      { id: "avoidMaterials", question: "Materials you dislike?", type: "multiselect", options: [
        { label: "Polyester", value: "polyester" }, { label: "Leather", value: "leather" },
        { label: "Wool (itchy)", value: "wool" }, { label: "Silk", value: "silk" },
        { label: "None — I'm open", value: "none" },
      ]},
      { id: "budget", question: "What's your typical budget for a single item?", type: "select", options: [
        { label: "Under $50", value: "budget" },
        { label: "$50-$150", value: "mid" },
        { label: "$150-$300", value: "premium" },
        { label: "$300+", value: "luxury" },
        { label: "Depends on the piece", value: "varies" },
      ]},
    ],
  },
  {
    category: "style",
    title: "Style Identity",
    description: "Let's discover your personal aesthetic. Pick outfits that appeal to you.",
    questions: [
      { id: "styleVibes", question: "Pick all the aesthetics that resonate with you", type: "visual-grid", options: [
        { label: "Minimalist", value: "minimalist", imageQuery: "korean minimalist mens fashion outfit clean" },
        { label: "Streetwear", value: "streetwear", imageQuery: "korean streetwear mens fashion outfit seoul" },
        { label: "Classic / Preppy", value: "classic", imageQuery: "korean classic preppy mens fashion outfit" },
        { label: "Rugged / Workwear", value: "rugged", imageQuery: "japanese workwear heritage mens outfit amekaji" },
        { label: "Athleisure", value: "athleisure", imageQuery: "korean athleisure mens outfit fashion" },
        { label: "Smart Casual", value: "smart-casual", imageQuery: "korean smart casual mens outfit fashion" },
        { label: "Avant-Garde", value: "avant-garde", imageQuery: "japanese avant garde mens fashion comme des garcons" },
        { label: "City Boy", value: "city-boy", imageQuery: "korean city boy mens fashion outfit trend" },
        { label: "Quiet Luxury", value: "quiet-luxury", imageQuery: "korean quiet luxury mens outfit fashion" },
        { label: "Japanese / Techwear", value: "techwear", imageQuery: "japanese techwear mens outfit acronym" },
        { label: "Ivy / Trad", value: "ivy", imageQuery: "japanese ivy style trad mens fashion" },
        { label: "Coastal / Relaxed", value: "coastal", imageQuery: "japanese coastal relaxed mens summer outfit" },
      ]},
      { id: "styleIcons", question: "Any style icons or people whose style you admire?", type: "text", placeholder: "e.g., Ryan Gosling, Tyler the Creator, David Beckham" },
      { id: "currentBrands", question: "Brands you currently wear and love?", type: "text", placeholder: "e.g., Nike, Uniqlo, COS, Reigning Champ" },
      { id: "aspirationalBrands", question: "Brands you'd love to wear more of?", type: "text", placeholder: "e.g., Aime Leon Dore, Our Legacy, Lemaire" },
    ],
  },
];
