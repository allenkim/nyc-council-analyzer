import { GoogleGenerativeAI } from "@google/generative-ai";

let client: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!client) {
    client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  }
  return client;
}

export async function analyzeWithGemini(
  prompt: string,
  options?: { imageBase64?: string; mimeType?: string }
) {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];

  if (options?.imageBase64) {
    parts.push({
      inlineData: {
        data: options.imageBase64,
        mimeType: options.mimeType || "image/jpeg",
      },
    });
  }

  parts.push({ text: prompt });

  const result = await model.generateContent(parts);
  return result.response.text();
}
