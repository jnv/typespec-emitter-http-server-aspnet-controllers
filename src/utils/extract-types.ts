import type { Enum, Model, Namespace, Program } from "@typespec/compiler";
import { isStdNamespace, isTemplateDeclaration } from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";

/**
 * Models with Tuple-typed properties (e.g. OAuth2 flow scopes) cannot be
 * rendered to C# and are typically auth decorator arguments, not API types.
 */
function hasTupleProperty(m: Model): boolean {
  for (const prop of m.properties.values()) {
    if (prop.type.kind === "Tuple") return true;
  }
  return false;
}

/**
 * Walks the global namespace tree (namespace.models, .enums, .namespaces).
 * We use manual recursion instead of navigateProgram/navigateTypesInNamespace so we
 * only collect direct namespace members (user-declared types), avoiding library-
 * introduced types that can reference unsupported intrinsics (e.g. unknown).
 * Typekit is used for array/record classification per AGENTS.md.
 */
function collectFromNamespace(
  program: Program,
  namespace: Namespace,
  models: Model[],
  enums: Enum[],
): void {
  if (isStdNamespace(namespace)) return;

  const $tk = $(program);
  for (const m of namespace.models.values()) {
    if ($tk.array.is(m) || $tk.record.is(m)) continue;
    if (isTemplateDeclaration(m)) continue;
    if (hasTupleProperty(m)) continue;
    models.push(m);
  }
  for (const e of namespace.enums.values()) {
    enums.push(e);
  }
  for (const subNs of namespace.namespaces.values()) {
    if (!isStdNamespace(subNs)) {
      collectFromNamespace(program, subNs, models, enums);
    }
  }
}

/**
 * Extracts user-defined models and enums from the program.
 * Traverses the global namespace and its sub-namespaces (user spec only).
 * Uses typekit for model classification (array/record). Single entrypoint
 * so the emitter can call it once to get both lists.
 */
export function extractTypes(program: Program): { models: Model[]; enums: Enum[] } {
  const models: Model[] = [];
  const enums: Enum[] = [];
  const globalNs = program.getGlobalNamespaceType();
  collectFromNamespace(program, globalNs, models, enums);
  return { models, enums };
}
