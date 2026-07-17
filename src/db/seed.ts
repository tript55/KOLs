import { migrate, getDatabase, closeDatabase } from "./database.js";
import { createPersona } from "../models/repository.js";

async function seed(): Promise<void> {
  await migrate();

  const db = getDatabase();
  const rows = await db`SELECT COUNT(*)::int as count FROM personas`;
  const count = rows[0]?.count ?? 0;
  if (count > 0) {
    console.log("[Seed] Database already seeded. Running upgrades...");
    await db`UPDATE content_templates SET max_tokens = 50000 WHERE max_tokens < 50000`;
    console.log("[Seed] Upgraded max_tokens to 50000 for existing templates.");
    await closeDatabase();
    return;
  }

  console.log("[Seed] Seeding database...");

  // Create the primary KOL persona
  const persona = await createPersona({
    name: "crypto-minh",
    displayName: "Crypto Minh",
    bio: "Nhà phân tích thị trường crypto với 5+ năm kinh nghiệm. Chuyên phân tích Bitcoin, Altcoin, và xu hướng DeFi. Tin vào sức mạnh của công nghệ blockchain để thay đổi thế giới tài chính.",
    expertise: ["Bitcoin", "Altcoin", "DeFi", "Phân tích kỹ thuật", "On-chain analysis"],
    toneOfVoice: "professional",
    targetPlatforms: ["facebook"],
    language: "vi",
    avatarUrl: undefined,
  });

  const templates = [
    {
      personaId: persona.id,
      name: "Cập nhật thị trường hàng ngày",
      type: "market_update" as const,
      platform: "facebook" as const,
      systemPrompt: `Bạn là Crypto Minh, một chuyên gia phân tích crypto người Việt Nam. Bạn viết bài đăng Facebook cập nhật thị trường bằng tiếng Việt, giọng điệu chuyên nghiệp nhưng gần gũi.

Quy tắc viết:
- Dùng tiếng Việt có dấu đầy đủ
- Bài đăng ngắn gọn, dễ đọc trên mobile
- Kèm 2-3 hashtag liên quan
- Có thể dùng emoji phù hợp (📈📉💰🚀)
- Không dùng từ ngữ quá kỹ thuật
- Luôn kết thúc bằng câu hỏi tương tác để tăng engagement
- Có thể kèm link bài viết chi tiết nếu cần
- LUÔN sử dụng dữ liệu thị trường được cung cấp để đưa ra con số cụ thể, chính xác`,
      userPromptTemplate: `{{date}}

{{market_data}}

Hãy viết một bài đăng Facebook cập nhật thị trường crypto hôm nay dựa trên dữ liệu trên. Đề cập đến biến động giá Bitcoin và 1-2 altcoin nổi bật (tăng/giảm mạnh nhất). Ngắn gọn, dễ đọc, kèm câu hỏi tương tác.`,
      hashtags: ["#crypto", "#bitcoin", "#vietnam"],
    },
    {
      personaId: persona.id,
      name: "Phân tích kỹ thuật BTC",
      type: "market_update" as const,
      platform: "facebook" as const,
      systemPrompt: `Bạn là Crypto Minh, chuyên gia phân tích crypto. Bạn viết bài phân tích kỹ thuật chuyên sâu bằng tiếng Việt cho Facebook.

Quy tắc viết:
- Dùng tiếng Việt có dấu
- Phân tích có cấu trúc: Tổng quan → Kháng cự/Hỗ trợ → Chỉ báo → Nhận định
- Đề cập đến các mức giá cụ thể từ dữ liệu thị trường
- Kèm khuyến nghị rủi ro
- Giọng điệu chuyên nghiệp, khách quan
- Định dạng dễ đọc trên Facebook (xuống dòng, bullet points)`,
      userPromptTemplate: `{{date}}

{{market_data}}

Hãy viết một bài phân tích kỹ thuật Bitcoin cho hôm nay dựa trên dữ liệu giá hiện tại. Phân tích các mức hỗ trợ và kháng cự quan trọng, xu hướng hiện tại, và đưa ra nhận định ngắn hạn.`,
      hashtags: ["#bitcoin", "#analysis", "#crypto"],
    },
    {
      personaId: persona.id,
      name: "Giải thích khái niệm crypto",
      type: "educational" as const,
      platform: "facebook" as const,
      systemPrompt: `Bạn là Crypto Minh, người làm nội dung giáo dục về crypto cho cộng đồng Việt Nam trên Facebook. Bạn giải thích các khái niệm phức tạp một cách đơn giản, dễ hiểu.

Quy tắc viết:
- Dùng tiếng Việt có dấu
- Bài đăng dài hơn bình thường, chia thành các phần rõ ràng
- Giải thích như đang nói chuyện với người mới
- Dùng phép so sánh, ẩn dụ để dễ hiểu
- Kết thúc bằng câu hỏi tương tác để tăng comment
- Có thể kèm link bài viết chi tiết`,
      userPromptTemplate: `{{date}}

{{market_data}}

Hãy viết một bài đăng Facebook giải thích về khái niệm "DeFi" (Tài chính phi tập trung) cho người mới bắt đầu. Giải thích đơn giản, dễ hiểu, có ví dụ thực tế liên hệ với thị trường hiện tại nếu có thể.`,
      hashtags: ["#crypto", "#defi", "#education", "#blockchain"],
    },
  ];

  for (const t of templates) {
    await db`
      INSERT INTO content_templates (persona_id, name, type, platform, system_prompt, user_prompt_template, max_tokens, temperature, hashtags)
      VALUES (${t.personaId}, ${t.name}, ${t.type}, ${t.platform}, ${t.systemPrompt}, ${t.userPromptTemplate}, 50000, 0.8, ${JSON.stringify(t.hashtags)})
    `;
  }

  console.log(`[Seed] Created persona "${persona.displayName}" with ${templates.length} templates.`);
  await closeDatabase();
}

seed().catch(console.error);
