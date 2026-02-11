import type { Enum, Program } from "@typespec/compiler";
import { extractTypes } from "./extract-types.js";

/**
 * Extracts all user-defined enums from the program (Semantic Walker).
 * Skips std library enums. For a single pass over the program that also
 * collects models, use extractTypes(program) instead.
 */
export function extractEnums(program: Program): Enum[] {
  return extractTypes(program).enums;
}
