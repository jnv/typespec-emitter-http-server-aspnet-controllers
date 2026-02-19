import { ok } from "node:assert/strict";
import { describe, it } from "vitest";
import { HttpSpecsTester } from "./http-specs-test-host.js";
import { discoverHttpSpecs, readSpecContent } from "./http-specs-utils.js";

/**
 * Specs that are expected to fail compilation or emission.
 * Each key is the spec category (e.g. "payload/xml").
 * When the emitter adds support for a feature, remove its entry here.
 */
const EXPECTED_FAILURES: Set<string> = new Set([
  // Union types — emitter-framework TypeExpression does not support Union
  "authentication/api-key",
  "authentication/http/custom",
  "authentication/oauth2",
  "payload/xml",
  "response/status-code-range",
  "special-headers/repeatability",
  "type/property/optionality",
  "type/union",

  // Intrinsic types (unknown/never) — emitter-framework TypeExpression does not support these
  "type/array",
  "type/dictionary",
  "type/property/additional-properties",
  "type/property/value-types",
  "type/scalar",

  // UnionVariant — emitter-framework TypeExpression does not support UnionVariant
  "type/model/inheritance/enum-discriminator",
]);

/**
 * Specs to skip entirely (e.g. they cause compiler-level diagnostics
 * unrelated to the emitter, or require features not available in the tester).
 */
const SKIP_SPECS: Set<string> = new Set([
  // Compiler diagnostics unrelated to emitter
  "special-words",
  "streaming/jsonl",
]);

const specs = await discoverHttpSpecs();

describe("http-specs compilation", () => {
  for (const spec of specs) {
    if (SKIP_SPECS.has(spec.category)) {
      it.skip(`compiles ${spec.category}`, () => {});
      continue;
    }

    const fails = EXPECTED_FAILURES.has(spec.category);

    it(`compiles ${spec.category}`, { timeout: 30_000, fails }, async () => {
      const content = await readSpecContent(spec);
      const result = await HttpSpecsTester.compile(content);
      const outputFiles = Object.keys(result.outputs);
      ok(
        outputFiles.length > 0,
        `${spec.category} should produce at least one output file, got none`,
      );
    });
  }
});
