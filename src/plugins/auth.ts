import { FastifyRequest, FastifyReply } from "fastify";
import { createClient } from "@supabase/supabase-js";
import { getEnv } from "../config/env.js";

const env = getEnv();

// Initialize Supabase client
const supabaseUrl = env.SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || "placeholder";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  // If no Supabase URL is configured, we might be in local dev without auth,
  // but to meet acceptance criteria, we MUST return 401 if token is missing.
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({ success: false, error: "Unauthorized - No token" });
  }

  const token = authHeader.replace("Bearer ", "");

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return reply.status(401).send({ success: false, error: "Unauthorized - Invalid token" });
  }

  // Attach user to request
  (req as any).user = user;
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  await requireAuth(req, reply);
  if (reply.sent) return;

  const user = (req as any).user;
  // By default we assume role is stored in user_metadata.role
  const role = user?.user_metadata?.role || "viewer";

  if (role !== "admin") {
    return reply.status(403).send({ success: false, error: "Forbidden - Admin access required" });
  }
}
