import { NextRequest } from "next/server";
import { db } from "@/lib/db";

/**
 * Append an audit entry. Never throws (an audit failure must not break the request).
 * Callers must NOT pass passwords or patient-identifying data in `detail`.
 */
export async function audit(req: NextRequest | null, actor: string, action: string, target = "", detail = "") {
  try {
    const ip = req ? (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() : "";
    await db.auditLog.create({
      data: { actor: String(actor).slice(0, 200), action: action.slice(0, 80), target: String(target).slice(0, 200), detail: String(detail).slice(0, 500), ip: ip.slice(0, 64) },
    });
  } catch (e) {
    console.error("audit write failed:", e);
  }
}
