import { mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  ClientMessageSchema,
  SessionCreatedSchema,
  PairedSchema,
  ErrorSchema,
  PROTOCOL_VERSION,
} from "../src/protocol";

/**
 * Emits shared/protocol/protocol.schema.json from protocol.ts.
 * protocol.ts stays the single source of truth -- never hand-edit the JSON.
 * Run `npm run schema:generate` after any protocol change.
 */

const OUT = resolve(__dirname, "../../shared/protocol/protocol.schema.json");

const schema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://visionbridge.local/protocol.schema.json",
  title: `VisionBridge relay protocol v${PROTOCOL_VERSION}`,
  description:
    "Generated from relay/src/protocol.ts by scripts/generateSchema.ts. Do not edit by hand.",
  definitions: {
    ClientMessage: zodToJsonSchema(ClientMessageSchema, { target: "jsonSchema7" }),
    SessionCreated: zodToJsonSchema(SessionCreatedSchema, { target: "jsonSchema7" }),
    Paired: zodToJsonSchema(PairedSchema, { target: "jsonSchema7" }),
    Error: zodToJsonSchema(ErrorSchema, { target: "jsonSchema7" }),
  },
  oneOf: [
    { $ref: "#/definitions/ClientMessage" },
    { $ref: "#/definitions/SessionCreated" },
    { $ref: "#/definitions/Paired" },
    { $ref: "#/definitions/Error" },
  ],
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(schema, null, 2) + "\n");
console.log(`wrote ${OUT}`);
