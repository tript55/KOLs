import {
  getScheduledPost,
  getTemplate,
  listScheduledPosts,
  recordAnalytics,
  updateWorkflowState,
} from "../models/repository.js";
import { getDateContext, getMarketContext } from "./market-data.js";
import { getNewsContext, getNewsSnapshot } from "./news-fetcher.js";
import { generateContent, generateCustomContent } from "./content-generator.js";
import { fetchFacebookFeedback, publishContent } from "./publisher.js";
import type {
  ContentIdea,
  FacebookWorkflowMetadata,
  FeedbackSnapshot,
  PublishResult,
  ResearchSnapshot,
  ScheduledPost,
} from "../types/index.js";

const DEFAULT_DISCLAIMER =
  "Nội dung mang tính giáo dục tài chính, không phải khuyến nghị đầu tư cá nhân. Thị trường biến động cao, hãy tự quản trị rủi ro và vốn.";
const BANNED_PHRASES = ["bão lời", "chắc chắn thắng", "all-in", "không thể lỗ"];

export async function runFacebookWorkflow(
  postId: number,
): Promise<ScheduledPost> {
  const initial = await getScheduledPost(postId);
  if (!initial) {
    throw new Error(`Post ${postId} not found`);
  }

  if (initial.platform !== "facebook") {
    return initial;
  }

  let post = initial;

  if (post.status === "posted" && post.workflowStage === "completed") {
    return post;
  }

  try {
    post = await advanceResearch(post);
    post = await advanceIdeaGeneration(post);
    post = await advanceDrafting(post);
    post = await advanceCompliance(post);
    post = await advanceScheduling(post);

    if (
      post.status === "scheduled" &&
      post.scheduledAt &&
      post.scheduledAt > new Date().toISOString()
    ) {
      return post;
    }

    post = await advancePublishing(post);
    post = await advanceFeedback(post);
    post = await advanceLearning(post);

    return post;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown workflow error";
    const failed = await updateWorkflowState(post.id, {
      status: "failed",
      lastError: message,
      workflowAttempts: post.workflowAttempts + 1,
    });

    if (!failed) {
      throw error;
    }

    return failed;
  }
}

async function advanceResearch(post: ScheduledPost): Promise<ScheduledPost> {
  if (post.workflowStage !== "research") {
    return post;
  }

  const posts = await listScheduledPosts({
    status: "posted",
    personaId: post.personaId,
  });

  const recentLearningNotes = posts
    .filter((entry) => entry.platform === "facebook")
    .slice(-5)
    .flatMap((entry) => {
      const metadata = asWorkflowMetadata(entry.metadata);
      return metadata.learning?.nextPromptAdjustments ?? [];
    })
    .slice(0, 5);

  const [marketContext, dateContext, newsContext] = await Promise.all([
    getMarketContext(),
    Promise.resolve(getDateContext()),
    getNewsContext(),
  ]);

  // Extract Fear & Greed for dedicated sentiment context
  const snapshot = await getNewsSnapshot();
  const sentimentContext = snapshot.fearGreed
    ? `CHỈ SỐ TÂM LÝ THỊ TRƯỜNG: ${snapshot.fearGreed.value}/100 — ${snapshot.fearGreed.valueText} (${snapshot.fearGreed.value <= 25 ? "cơ hội mua tiềm năng" : snapshot.fearGreed.value >= 75 ? "cảnh báo tham lam" : "thị trường cân bằng"})`
    : "";

  const metadata = withMetadata(post, {
    research: {
      marketContext,
      dateContext,
      strategyTags: deriveStrategyTags(post),
      recentLearningNotes,
      generatedAt: new Date().toISOString(),
      newsContext: newsContext || undefined,
      sentimentContext: sentimentContext || undefined,
    },
  });

  return mustUpdate(post.id, {
    metadata,
    workflowStage: "idea_generation",
    lastError: null,
  });
}

async function advanceIdeaGeneration(
  post: ScheduledPost,
): Promise<ScheduledPost> {
  if (post.workflowStage !== "idea_generation") {
    return post;
  }

  const metadata = ensureMetadata(post);
  const research = metadata.research;
  if (!research) {
    throw new Error("Missing research snapshot");
  }

  const prompt = [
    "Bạn là content strategist cho Facebook page tài chính/crypto tại Việt Nam.",
    "Tạo 3 ý tưởng bài đăng ngắn gọn bằng JSON array.",
    "Mỗi item gồm 4 trường: angle, hook, audience, rationale.",
    "Tập trung vào nhà đầu tư Việt Nam và nhân viên có tiền nhàn rỗi để đầu tư.",
    "Ưu tiên các angle bám sát tin tức thực tế và tâm lý thị trường hiện tại.",
    `Tags chiến lược: ${research.strategyTags.join(", ") || "facebook, vietnam"}`,
    `Ghi chú học tập gần đây: ${research.recentLearningNotes.join(" | ") || "không có"}`,
    research.dateContext,
    research.marketContext,
    // Inject live news context only if available
    ...(research.newsContext ? [research.newsContext] : []),
    ...(research.sentimentContext ? [research.sentimentContext] : []),
  ].join("\n\n");

  const result = await generateCustomContent(
    "Chỉ trả về JSON hợp lệ, không markdown, không giải thích thêm.",
    prompt,
    1200,
    0.4,
  );

  const parsedIdeas = parseIdeas(result.content);
  const nextMetadata = withMetadata(post, {
    ideas: parsedIdeas,
    selectedIdeaIndex: 0,
  });

  return mustUpdate(post.id, {
    metadata: nextMetadata,
    workflowStage: "drafting",
  });
}

async function advanceDrafting(post: ScheduledPost): Promise<ScheduledPost> {
  if (post.workflowStage !== "drafting") {
    return post;
  }

  const metadata = ensureMetadata(post);
  const research = metadata.research;
  const ideas = metadata.ideas;
  const selectedIdea = ideas?.[metadata.selectedIdeaIndex ?? 0];

  if (!research || !selectedIdea) {
    throw new Error("Missing idea generation context");
  }

  if (!post.templateId) {
    throw new Error(`Post ${post.id} has no template for drafting`);
  }

  const result = await generateContent(post.templateId, {
    strategy_angle: selectedIdea.angle,
    content_hook: selectedIdea.hook,
    target_audience: selectedIdea.audience,
    rationale: selectedIdea.rationale,
    market_data: research.marketContext,
    date: research.dateContext,
    // Inject live news & sentiment context if research captured them
    ...(research.newsContext ? { news_context: research.newsContext } : {}),
    ...(research.sentimentContext
      ? { sentiment_context: research.sentimentContext }
      : {}),
  });

  const nextMetadata = withMetadata(post, {
    draftContent: result.content,
  });

  return mustUpdate(post.id, {
    content: result.content,
    metadata: nextMetadata,
    workflowStage: "compliance",
    status: "generating",
  });
}

async function advanceCompliance(post: ScheduledPost): Promise<ScheduledPost> {
  if (post.workflowStage !== "compliance") {
    return post;
  }

  const content = post.content ?? ensureMetadata(post).draftContent ?? "";
  const issues: string[] = [];

  if (!content.trim()) {
    issues.push("No generated content available");
  }

  if (content.length > 5000) {
    issues.push("Content exceeds Facebook-friendly length");
  }

  const lower = content.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) {
      issues.push(`Contains banned phrase: ${phrase}`);
    }
  }

  const finalContent = content.includes(DEFAULT_DISCLAIMER)
    ? content
    : `${content.trim()}\n\n${DEFAULT_DISCLAIMER}`.trim();

  const nextMetadata = withMetadata(post, {
    compliance: {
      status: issues.length === 0 ? "passed" : "needs_review",
      issues,
      finalContent,
      checkedAt: new Date().toISOString(),
    },
    draftContent: finalContent,
  });

  if (issues.length > 0) {
    return mustUpdate(post.id, {
      content: finalContent,
      metadata: nextMetadata,
      workflowStage: "compliance",
      status: "failed",
      lastError: issues.join("; "),
    });
  }

  return mustUpdate(post.id, {
    content: finalContent,
    metadata: nextMetadata,
    workflowStage: "scheduling",
    status: "scheduled",
    lastError: null,
  });
}

async function advanceScheduling(post: ScheduledPost): Promise<ScheduledPost> {
  if (post.workflowStage !== "scheduling") {
    return post;
  }

  if (!post.scheduledAt) {
    return mustUpdate(post.id, {
      scheduledAt: new Date().toISOString(),
    });
  }

  return post;
}

async function advancePublishing(post: ScheduledPost): Promise<ScheduledPost> {
  if (!["scheduling", "publishing"].includes(post.workflowStage)) {
    return post;
  }

  if (!post.scheduledAt || post.scheduledAt > new Date().toISOString()) {
    return post;
  }

  const publishResult = await publishContent(
    post.platform,
    post.content ?? ensureMetadata(post).draftContent ?? "",
  );
  const nextMetadata = ensureMetadata(post);

  return mustUpdate(post.id, {
    workflowStage: "feedback",
    status: "posted",
    externalPostId: publishResult.externalPostId,
    postedAt: publishResult.publishedAt,
    metadata: nextMetadata,
    lastError: null,
  });
}

async function advanceFeedback(post: ScheduledPost): Promise<ScheduledPost> {
  if (post.workflowStage !== "feedback") {
    return post;
  }

  const snapshot = await collectFeedback(post);
  const nextMetadata = withMetadata(post, {
    feedback: snapshot,
  });

  await recordAnalytics({
    postId: post.id,
    platform: "facebook",
    eventType: "like",
    count: snapshot.likes,
    recordedAt: snapshot.fetchedAt,
  });
  await recordAnalytics({
    postId: post.id,
    platform: "facebook",
    eventType: "comment",
    count: snapshot.comments,
    recordedAt: snapshot.fetchedAt,
  });
  await recordAnalytics({
    postId: post.id,
    platform: "facebook",
    eventType: "share",
    count: snapshot.shares,
    recordedAt: snapshot.fetchedAt,
  });

  return mustUpdate(post.id, {
    metadata: nextMetadata,
    workflowStage: "learning",
  });
}

async function advanceLearning(post: ScheduledPost): Promise<ScheduledPost> {
  if (post.workflowStage !== "learning") {
    return post;
  }

  const metadata = ensureMetadata(post);
  const feedback = metadata.feedback;
  const outcome = !feedback
    ? "unknown"
    : feedback.shares >= 5 || feedback.comments >= 5
      ? "strong"
      : feedback.shares === 0 && feedback.comments === 0
        ? "weak"
        : "average";

  const nextMetadata = withMetadata(post, {
    learning: {
      outcome,
      notes: buildLearningNotes(metadata.feedback),
      nextPromptAdjustments: buildPromptAdjustments(metadata.feedback),
      learnedAt: new Date().toISOString(),
    },
  });

  return mustUpdate(post.id, {
    metadata: nextMetadata,
    workflowStage: "completed",
  });
}

async function collectFeedback(post: ScheduledPost): Promise<FeedbackSnapshot> {
  if (post.externalPostId) {
    try {
      return await fetchFacebookFeedback(post.externalPostId);
    } catch {
      // Fall through to simulated snapshot for local/dev mode.
    }
  }

  return {
    likes: 0,
    comments: 0,
    shares: 0,
    fetchedAt: new Date().toISOString(),
  };
}

function deriveStrategyTags(post: ScheduledPost): string[] {
  const metadata = asWorkflowMetadata(post.metadata);
  const tags = ["facebook", "vietnam", "investor"];

  if (metadata.strategyKey) tags.push(metadata.strategyKey);
  if (metadata.audienceSegment) tags.push(metadata.audienceSegment);

  return tags;
}

function parseIdeas(raw: string): ContentIdea[] {
  try {
    const parsed = JSON.parse(raw) as ContentIdea[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("No idea candidates returned");
    }
    return parsed.slice(0, 3);
  } catch {
    return [
      {
        angle: "Cập nhật thị trường và kế hoạch quản trị rủi ro",
        hook: "Thị trường đang di chuyển ra sao và nhà đầu tư Việt nên làm gì?",
        audience: "Nhà đầu tư Việt Nam có dòng tiền nhàn rỗi hàng tháng",
        rationale:
          "An toàn, dễ hiểu, phù hợp nhu cầu cập nhật nhanh trên Facebook",
      },
    ];
  }
}

function buildLearningNotes(feedback?: FeedbackSnapshot): string[] {
  if (!feedback) {
    return ["Chưa có dữ liệu phản hồi từ Facebook Graph API."];
  }

  if (feedback.shares >= 5) {
    return [
      "Nội dung có xu hướng được chia sẻ, tiếp tục duy trì góc nhìn thực chiến.",
    ];
  }

  if (feedback.comments >= 5) {
    return ["Nội dung kích hoạt thảo luận, ưu tiên CTA dạng câu hỏi mở."];
  }

  return [
    "Tương tác trung bình hoặc thấp, cần thử nghiệm hook và CTA rõ ràng hơn.",
  ];
}

function buildPromptAdjustments(feedback?: FeedbackSnapshot): string[] {
  if (!feedback) {
    return [
      "Tăng trọng số cho bài educational và market recap đến khi có dữ liệu thật.",
    ];
  }

  if (feedback.shares >= 5) {
    return [
      "Tiếp tục dùng format checklist/carousel và hook giải thích nhanh.",
    ];
  }

  if (feedback.comments >= 5) {
    return ["Kết thúc bài bằng câu hỏi về phân bổ vốn và khẩu vị rủi ro."];
  }

  return [
    "Rút ngắn mở bài, làm rõ lợi ích với nhân viên có tiền nhàn rỗi để đầu tư.",
  ];
}

function withMetadata(
  post: ScheduledPost,
  patch: Partial<FacebookWorkflowMetadata>,
): FacebookWorkflowMetadata {
  return {
    ...ensureMetadata(post),
    ...patch,
  };
}

function ensureMetadata(post: ScheduledPost): FacebookWorkflowMetadata {
  const metadata = asWorkflowMetadata(post.metadata);
  return {
    ...metadata,
    workflowVersion: 1,
  };
}

function asWorkflowMetadata(
  metadata: ScheduledPost["metadata"],
): FacebookWorkflowMetadata {
  if (!metadata) {
    return { workflowVersion: 1 };
  }

  return metadata as FacebookWorkflowMetadata;
}

async function mustUpdate(
  postId: number,
  patch: Parameters<typeof updateWorkflowState>[1],
): Promise<ScheduledPost> {
  const updated = await updateWorkflowState(postId, patch);
  if (!updated) {
    throw new Error(`Post ${postId} disappeared during workflow update`);
  }
  return updated;
}
