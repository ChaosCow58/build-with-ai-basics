import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { QuizTokenPayload } from "./types";

const DEV_FALLBACK_SECRET = "teachback-dev-only-secret-change-me";
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function key(): Buffer {
  const secret = process.env.QUIZ_TOKEN_SECRET || DEV_FALLBACK_SECRET;
  return createHash("sha256").update(secret).digest();
}

/**
 * Seal the quiz (including the private rubric) into an opaque token.
 * AES-256-GCM gives us both secrecy (the browser can't read the rubric)
 * and integrity (the auth tag acts like an HMAC, so tampering is rejected).
 * That keeps grading stateless: no server storage needed.
 */
export function sealQuiz(payload: Omit<QuizTokenPayload, "v" | "exp">, now = Date.now()): string {
  const full: QuizTokenPayload = { v: 1, exp: now + TOKEN_TTL_MS, ...payload };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(full), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, body].map((b) => b.toString("base64url")).join(".");
}

export function openQuiz(token: string, now = Date.now()): QuizTokenPayload | null {
  try {
    const [ivB, tagB, bodyB] = token.split(".");
    if (!ivB || !tagB || !bodyB) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB, "base64url"));
    const json = Buffer.concat([decipher.update(Buffer.from(bodyB, "base64url")), decipher.final()]).toString("utf8");
    const payload = JSON.parse(json) as QuizTokenPayload;
    if (payload.v !== 1 || typeof payload.exp !== "number" || payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}
