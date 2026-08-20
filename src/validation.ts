import { ClientMessageSchema, MAX_MESSAGE_BYTES, type ClientMessage } from "./protocol";

export type ParseResult =
  | { ok: true; message: ClientMessage }
  | { ok: false; code: string; reason: string };

export function parseIncoming(raw: string): ParseResult {
  if (Buffer.byteLength(raw, "utf8") > MAX_MESSAGE_BYTES) {
    return { ok: false, code: "message_too_large", reason: "payload exceeds size limit" };
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, code: "invalid_json", reason: "not valid JSON" };
  }

  const result = ClientMessageSchema.safeParse(json);
  if (!result.success) {
    return {
      ok: false,
      code: "invalid_message",
      reason: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    };
  }

  return { ok: true, message: result.data };
}
