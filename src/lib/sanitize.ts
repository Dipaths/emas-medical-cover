import { Prisma } from "@prisma/client";

type Scalar = string | number | boolean;

/**
 * Builds a data object for a Prisma model from untrusted input:
 *  - only scalar fields that exist on the model (and are not in `deny`) are copied (no mass assignment),
 *  - values are coerced to the field's type (Int/Float must be finite and >= 0 where `nonNegative`),
 *  - strings are trimmed and length-capped.
 */
export function pickModelData(model: string, input: unknown, deny: string[]): Record<string, Scalar> {
  const m = Prisma.dmmf.datamodel.models.find(x => x.name === model);
  if (!m) throw new Error(`Unknown model ${model}`);
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: Record<string, Scalar> = {};
  for (const f of m.fields) {
    if (f.kind !== "scalar" || deny.includes(f.name) || !(f.name in src)) continue;
    const v = src[f.name];
    if (f.type === "String") {
      if (v === null || v === undefined) continue;
      out[f.name] = String(v).trim().slice(0, f.name === "medications" ? 20000 : 4000);
    } else if (f.type === "Int" || f.type === "Float") {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) continue;
      out[f.name] = f.type === "Int" ? Math.round(n) : n;
    } else if (f.type === "Boolean") {
      out[f.name] = v === true || v === "true";
    }
  }
  return out;
}

export const n0 = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};
