export type QuizCategory = "body" | "lifestyle" | "preferences" | "style";

export interface QuizQuestion {
  id: string;
  question: string;
  type: "select" | "multiselect" | "text" | "number" | "visual-grid" | "style-discovery";
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
      { id: "ageRange", question: "What's your age range?", type: "select", options: [
        { label: "Under 20", value: "under-20" },
        { label: "20–25", value: "20-25" },
        { label: "26–30", value: "26-30" },
        { label: "31–35", value: "31-35" },
        { label: "36–40", value: "36-40" },
        { label: "41–50", value: "41-50" },
        { label: "50+", value: "50-plus" },
      ]},
      { id: "heightFeet", question: "Height (feet)", type: "select", options: [
        { label: "4 ft", value: "4" },
        { label: "5 ft", value: "5" },
        { label: "6 ft", value: "6" },
        { label: "7 ft", value: "7" },
      ]},
      { id: "heightInches", question: "Height (inches)", type: "select", options: [
        { label: "0 in", value: "0" }, { label: "1 in", value: "1" },
        { label: "2 in", value: "2" }, { label: "3 in", value: "3" },
        { label: "4 in", value: "4" }, { label: "5 in", value: "5" },
        { label: "6 in", value: "6" }, { label: "7 in", value: "7" },
        { label: "8 in", value: "8" }, { label: "9 in", value: "9" },
        { label: "10 in", value: "10" }, { label: "11 in", value: "11" },
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
      { id: "materials", question: "Materials you love", type: "visual-grid", options: [
        { label: "Cotton", value: "cotton", imageQuery: "cotton fabric texture swatch close up" },
        { label: "Linen", value: "linen", imageQuery: "linen fabric texture swatch close up" },
        { label: "Denim", value: "denim", imageQuery: "denim fabric texture swatch close up" },
        { label: "Wool", value: "wool", imageQuery: "wool fabric texture swatch close up" },
        { label: "Leather", value: "leather", imageQuery: "leather texture swatch close up" },
        { label: "Cashmere", value: "cashmere", imageQuery: "cashmere fabric texture swatch close up" },
        { label: "Silk", value: "silk", imageQuery: "silk fabric texture swatch close up" },
        { label: "Corduroy", value: "corduroy", imageQuery: "corduroy fabric texture swatch close up" },
        { label: "Fleece", value: "fleece", imageQuery: "fleece fabric texture swatch close up" },
        { label: "Nylon / Tech", value: "technical", imageQuery: "technical nylon fabric texture close up" },
        { label: "Suede", value: "suede", imageQuery: "suede leather texture swatch close up" },
      ]},
      { id: "avoidMaterials", question: "Materials you avoid", type: "visual-grid", options: [
        { label: "Polyester", value: "polyester", imageQuery: "polyester fabric texture swatch close up" },
        { label: "Leather", value: "leather", imageQuery: "leather texture swatch close up" },
        { label: "Wool (itchy)", value: "wool", imageQuery: "wool fabric texture swatch close up" },
        { label: "Silk", value: "silk", imageQuery: "silk fabric texture swatch close up" },
        { label: "None — I'm open", value: "none" },
      ]},
      { id: "materialNotes", question: "Any specific material preferences?", type: "text", placeholder: "e.g., Only merino wool, no synthetic blends (optional)" },
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
    title: "Style Discovery",
    description: "Pick the outfits that speak to you — no labels, just vibes.",
    questions: [
      { id: "styleDiscovery", question: "", type: "style-discovery" },
    ],
  },
];
