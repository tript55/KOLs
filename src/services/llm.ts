import { getEnv } from "../config/env.js";
import type { GenerateContentResponse } from "../types/index.js";

interface LLMProvider {
  generate(systemPrompt: string, userPrompt: string, maxTokens: number, temperature: number): Promise<GenerateContentResponse>;
}

class AnthropicProvider implements LLMProvider {
  async generate(systemPrompt: string, userPrompt: string, maxTokens: number, temperature: number): Promise<GenerateContentResponse> {
    const env = getEnv();
    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    // Dynamic import so the SDK is only loaded when Anthropic is used
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({
      apiKey,
      baseURL: env.ANTHROPIC_BASE_URL,
    });

    const msg = await client.messages.create({
      model: env.LLM_MODEL,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = msg.content[0];
    const text = content?.type === "text" ? content.text : "";

    return {
      content: text,
      tokensUsed: msg.usage.input_tokens + msg.usage.output_tokens,
      model: msg.model,
    };
  }
}

class OpenAIProvider implements LLMProvider {
  async generate(systemPrompt: string, userPrompt: string, maxTokens: number, temperature: number): Promise<GenerateContentResponse> {
    const env = getEnv();
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({
      apiKey,
      baseURL: env.OPENAI_BASE_URL,
    });

    const completion = await client.chat.completions.create({
      model: env.LLM_MODEL,
      max_tokens: maxTokens,
      temperature,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const message = completion.choices[0]?.message;
    const content = message?.content || (message as unknown as { reasoning_content?: string })?.reasoning_content || "";

    return {
      content,
      tokensUsed: completion.usage?.total_tokens ?? 0,
      model: completion.model,
    };
  }
}

const providers: Record<string, new () => LLMProvider> = {
  anthropic: AnthropicProvider,
  openai: OpenAIProvider,
};

export function getLLMProvider(): LLMProvider {
  const env = getEnv();
  const Provider = providers[env.LLM_PROVIDER];
  if (!Provider) throw new Error(`Unknown LLM provider: ${env.LLM_PROVIDER}`);
  return new Provider();
}
