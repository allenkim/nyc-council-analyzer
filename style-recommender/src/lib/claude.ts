import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function analyzeWithClaude(
  prompt: string,
  options?: { model?: string; imageBase64?: string; mediaType?: string }
) {
  const claude = getClaudeClient();
  const model = options?.model || "claude-sonnet-4-6";

  const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

  if (options?.imageBase64) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: (options.mediaType || "image/jpeg") as "image/jpeg",
        data: options.imageBase64,
      },
    });
  }

  content.push({ type: "text", text: prompt });

  const response = await claude.messages.create({
    model,
    max_tokens: 4096,
    messages: [{ role: "user", content }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text || "";
}
