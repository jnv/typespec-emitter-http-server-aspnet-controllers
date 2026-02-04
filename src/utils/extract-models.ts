import type { Model, Namespace } from "@typespec/compiler";

/**
 * Recursively extracts all user-defined models from a namespace and its sub-namespaces.
 * Skips built-in array/record models (those with an indexer).
 */
export function extractModels(namespace: Namespace): Model[] {
  const models: Model[] = [];

  for (const model of namespace.models.values()) {
    if (!("indexer" in model) || !model.indexer) {
      models.push(model);
    }
  }

  for (const subNs of namespace.namespaces.values()) {
    models.push(...extractModels(subNs));
  }

  return models;
}
