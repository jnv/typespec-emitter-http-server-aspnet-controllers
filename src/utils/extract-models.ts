import type { Model, Program } from "@typespec/compiler";
import { extractTypes } from "./extract-types.js";

/**
 * Extracts all user-defined models from the program (Semantic Walker).
 * Skips std library and array/record models. For a single pass over the program
 * that also collects enums, use extractTypes(program) instead.
 */
export function extractModels(program: Program): Model[] {
  return extractTypes(program).models;
}
