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
      { id: "height", question: "What is your height?", type: "text", placeholder: "e.g., 5'10\" or 178cm" },
      { id: "weight", question: "What is your weight?", type: "text", placeholder: "e.g., 170 lbs or 77 kg" },
      { id: "bodyType", question: "How would you describe your build?", type: "select", options: [
        { label: "Slim / Lean", value: "slim" },
        { label: "Athletic / Muscular", value: "athletic" },
        { label: "Average", value: "average" },
        { label: "Stocky / Broad", value: "stocky" },
        { label: "Plus-size", value: "plus" },
      ]},
      { id: "preferredFit", question: "What fit do you prefer?", type: "visual-grid", options: [
        { label: "Slim Fit", value: "slim", imageQuery: "mens slim fit outfit" },
        { label: "Regular Fit", value: "regular", imageQuery: "mens regular fit outfit" },
        { label: "Relaxed / Oversized", value: "relaxed", imageQuery: "mens oversized relaxed fit outfit" },
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
        { label: "Solid / minimal", value: "solid", imageQuery: "solid color minimalist mens outfit" },
        { label: "Stripes", value: "stripes", imageQuery: "striped shirt mens outfit" },
        { label: "Plaid / check", value: "plaid", imageQuery: "plaid flannel mens outfit" },
        { label: "Floral", value: "floral", imageQuery: "floral print mens shirt" },
        { label: "Graphic / print", value: "graphic", imageQuery: "graphic tee mens outfit" },
        { label: "Geometric", value: "geometric", imageQuery: "geometric pattern mens shirt" },
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
        { label: "Minimalist", value: "minimalist", imageQuery: "minimalist mens fashion outfit 2025" },
        { label: "Streetwear", value: "streetwear", imageQuery: "streetwear mens fashion outfit 2025" },
        { label: "Classic / Preppy", value: "classic", imageQuery: "classic preppy mens fashion outfit" },
        { label: "Rugged / Workwear", value: "rugged", imageQuery: "rugged workwear mens outfit heritage" },
        { label: "Athleisure", value: "athleisure", imageQuery: "athleisure mens outfit 2025" },
        { label: "Smart Casual", value: "smart-casual", imageQuery: "smart casual mens outfit 2025" },
        { label: "Avant-Garde", value: "avant-garde", imageQuery: "avant garde mens fashion outfit" },
        { label: "Bohemian", value: "bohemian", imageQuery: "bohemian mens fashion outfit" },
        { label: "Scandinavian", value: "scandinavian", imageQuery: "scandinavian minimal mens outfit" },
        { label: "Japanese / Techwear", value: "techwear", imageQuery: "japanese techwear mens outfit" },
        { label: "Ivy / Trad", value: "ivy", imageQuery: "ivy league trad mens fashion" },
        { label: "Coastal / Relaxed", value: "coastal", imageQuery: "coastal relaxed mens summer outfit" },
      ]},
      { id: "styleIcons", question: "Any style icons or people whose style you admire?", type: "text", placeholder: "e.g., Ryan Gosling, Tyler the Creator, David Beckham" },
      { id: "currentBrands", question: "Brands you currently wear and love?", type: "text", placeholder: "e.g., Nike, Uniqlo, COS, Reigning Champ" },
      { id: "aspirationalBrands", question: "Brands you'd love to wear more of?", type: "text", placeholder: "e.g., Aime Leon Dore, Our Legacy, Lemaire" },
    ],
  },
];
