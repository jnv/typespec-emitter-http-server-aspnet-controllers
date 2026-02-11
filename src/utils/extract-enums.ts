import { isStdNamespace, type Enum, type Namespace } from "@typespec/compiler";

/**
 * Recursively extracts all user-defined enums from a namespace and its sub-namespaces.
 * Skips enums from the TypeSpec standard library.
 */
export function extractEnums(namespace: Namespace): Enum[] {
  const enums: Enum[] = [];

  if (isStdNamespace(namespace)) {
    return enums;
  }

  for (const enumType of namespace.enums.values()) {
    enums.push(enumType);
  }

  for (const subNs of namespace.namespaces.values()) {
    if (!isStdNamespace(subNs)) {
      enums.push(...extractEnums(subNs));
    }
  }

  return enums;
}
