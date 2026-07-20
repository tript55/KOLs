import { FastifyInstance } from "fastify";
import { generateContent } from "../../services/content-generator.js";
import { getLLMProvider } from "../../services/llm.js";
import {
  getMarketContext,
  getDateContext,
} from "../../services/market-data.js";
import type { ApiResponse } from "../../types/index.js";

export function registerGenerationRoutes(app: FastifyInstance): void {
  app.post("/api/generate", async (req): Promise<ApiResponse<unknown>> => {
    const body = req.body as {
      templateId: number;
      context?: Record<string, string>;
    };
    try {
      const result = await generateContent(body.templateId, body.context ?? {});
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  app.post(
    "/api/generate/suggest-concept",
    async (): Promise<ApiResponse<unknown>> => {
      try {
        const [marketData, dateContext] = await Promise.all([
          getMarketContext(),
          Promise.resolve(getDateContext()),
        ]);

        const systemPrompt = `Bạn là một chuyên gia phân tích thị trường crypto, giúp đề xuất các chủ đề giáo dục thú vị và phù hợp với xu hướng thị trường hiện tại cho cộng đồng Việt Nam.`;

        const userPrompt = `Dựa trên dữ liệu thị trường crypto hiện tại:

${marketData}

Ngày: ${dateContext}

Hãy đề xuất MỘT khái niệm crypto thú vị và phù hợp để giải thích cho người mới bắt đầu. Chọn chủ đề đang được quan tâm hoặc có liên hệ với biến động thị trường hiện tại.

Trả lời theo format:
Concept: [tên khái niệm ngắn gọn]
Lý do: [1-2 câu giải thích tại sao chủ đề này thú vị/phù hợp lúc này]

Ví dụ format:
Concept: Staking là gì?
Lý do: Ethereum đang có nhiều thay đổi về cơ chế staking, nhiều người Việt quan tâm.`;

        const provider = getLLMProvider();
        const result = await provider.generate(
          systemPrompt,
          userPrompt,
          50000,
          0.9,
        );

        return { success: true, data: { suggestion: result.content } };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );
}
