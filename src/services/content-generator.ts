import { getTemplate } from "../models/repository.js";
import { getLLMProvider } from "./llm.js";
import { getMarketContext, getDateContext } from "./market-data.js";
import type { GenerateContentResponse } from "../types/index.js";

/**
 * Generate content using a template and optional dynamic context.
 * The template's userPromptTemplate supports {{key}} placeholders
 * that get replaced with values from the context map.
 *
 * Auto-injected context variables (finance agent enrichment):
 * - {{market_data}}: Live crypto market data from Binance
 * - {{date}}: Current date/time in Vietnamese
 */
export async function generateContent(
  templateId: number,
  context: Record<string, string> = {},
): Promise<GenerateContentResponse> {
  const template = await getTemplate(templateId);
  if (!template) throw new Error(`Template ${templateId} not found`);

  const provider = getLLMProvider();

  const [marketData, dateContext] = await Promise.all([
    getMarketContext(),
    Promise.resolve(getDateContext()),
  ]);

  const enrichedContext: Record<string, string> = {
    market_data: marketData,
    date: dateContext,
    ...context,
  };

  let userPrompt = template.userPromptTemplate;
  for (const [key, value] of Object.entries(enrichedContext)) {
    userPrompt = userPrompt.replace(new RegExp(`{{${key}}}`, "g"), value);
  }

  const effectiveMaxTokens = Math.max(template.maxTokens, 50000);

  return provider.generate(
    template.systemPrompt,
    userPrompt,
    effectiveMaxTokens,
    template.temperature,
  );
}

/**
 * Generate content with a custom prompt (no template lookup).
 */
export async function generateCustomContent(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 50000,
  temperature: number = 0.8,
): Promise<GenerateContentResponse> {
  const provider = getLLMProvider();
  return provider.generate(systemPrompt, userPrompt, maxTokens, temperature);
}
