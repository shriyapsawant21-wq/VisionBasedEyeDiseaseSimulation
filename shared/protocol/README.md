# shared/protocol

The wire contract between the Unity simulation device and the doctor controller.

| File | What it is |
|---|---|
| `commands.md` | Human-readable reference. Start here. |
| `protocol.schema.json` | JSON Schema (draft-07), **generated** — do not hand-edit. |
| `examples/valid/` | One well-formed message per type. |
| `examples/invalid/` | Messages the relay must reject, and why. |

## Source of truth

`relay/src/protocol.ts` defines the protocol. Everything in this folder is
derived from it, and `relay/tests/examples.test.ts` fails the build if the
examples stop matching.

After changing `protocol.ts`:

```bash
cd relay
npm run schema:generate
npm test
```

Then update `commands.md` by hand and add examples for anything new.

## Changing the protocol

Both clients mirror these definitions, so a change breaks two codebases at once.
Route protocol changes through the relay owner rather than adding fields
independently on either side.
