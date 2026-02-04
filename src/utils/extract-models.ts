import { isStdNamespace, type Model, type Namespace } from "@typespec/compiler";

/**
 * Recursively extracts all user-defined models from a namespace and its sub-namespaces.
 * Skips built-in array/record models (those with an indexer).
 * Skips models from the TypeSpec standard library (e.g. DiscriminatedOptions) to avoid
 * emitting types the C# TypeExpression does not support (e.g. union "object" | "none").
 */
export function extractModels(namespace: Namespace): Model[] {
  const models: Model[] = [];

  if (isStdNamespace(namespace)) {
    return models;
  }

  for (const model of namespace.models.values()) {
    if (!("indexer" in model) || !model.indexer) {
      models.push(model);
    }
  }

  for (const subNs of namespace.namespaces.values()) {
    if (!isStdNamespace(subNs)) {
      models.push(...extractModels(subNs));
    }
  }

  return models;
}
