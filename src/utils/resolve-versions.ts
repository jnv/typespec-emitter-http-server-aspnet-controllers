import type { Namespace, Program } from "@typespec/compiler";
import { isStdNamespace } from "@typespec/compiler";
import {
  unsafe_mutateSubgraphWithNamespace as mutateSubgraphWithNamespace,
} from "@typespec/compiler/experimental";

export interface VersionSnapshot {
  /** Human-readable version label from the enum member value (e.g. "v1", "2024-01-01") */
  versionLabel: string;
  /** C#-safe identifier for namespaces and directories (e.g. "V1", "V2024_01_01") */
  sanitizedLabel: string;
  /** The mutated namespace scoped to this version */
  namespace: Namespace;
}

export interface VersionedEmitPlan {
  /** Whether the service uses @versioned */
  isVersioned: boolean;
  /** Per-version snapshots. Empty if not versioned. */
  snapshots: VersionSnapshot[];
}

/** Sanitize a version label for use in C# namespaces and directory names. */
export function sanitizeVersionLabel(label: string): string {
  let sanitized = label.replace(/[^a-zA-Z0-9]/g, "_");
  if (/^[0-9]/.test(sanitized)) sanitized = "V" + sanitized;
  else sanitized = sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
  return sanitized;
}

/**
 * Searches the namespace tree for a versioned namespace.
 * Walks the global namespace and its non-std children.
 */
function findVersionedNamespaceInTree(
  program: Program,
  versioningModule: typeof import("@typespec/versioning"),
): Namespace | undefined {
  const globalNs = program.getGlobalNamespaceType();

  // Check global namespace itself
  const globalVersioned = versioningModule.findVersionedNamespace(program, globalNs);
  if (globalVersioned) return globalVersioned;

  // Check direct children
  for (const subNs of globalNs.namespaces.values()) {
    if (isStdNamespace(subNs)) continue;
    const versioned = versioningModule.findVersionedNamespace(program, subNs);
    if (versioned) return versioned;
  }

  return undefined;
}

/**
 * Resolves versioning information for the program.
 * Dynamically imports @typespec/versioning to avoid hard dependency.
 * Searches the namespace tree for a @versioned namespace and creates
 * per-version snapshots. Returns a non-versioned plan if no versioning is found.
 */
export async function resolveVersionPlan(
  program: Program,
): Promise<VersionedEmitPlan> {
  let versioningModule: typeof import("@typespec/versioning") | undefined;
  try {
    versioningModule = await import("@typespec/versioning");
  } catch {
    return { isVersioned: false, snapshots: [] };
  }

  const versionedNs = findVersionedNamespaceInTree(program, versioningModule);
  if (!versionedNs) {
    return { isVersioned: false, snapshots: [] };
  }

  const result = versioningModule.getVersioningMutators(program, versionedNs);
  if (!result || result.kind !== "versioned") {
    return { isVersioned: false, snapshots: [] };
  }

  const snapshots: VersionSnapshot[] = [];
  for (const snapshot of result.snapshots) {
    const label = snapshot.version.value ?? snapshot.version.name;
    const mutated = mutateSubgraphWithNamespace(program, [snapshot.mutator], versionedNs);
    snapshots.push({
      versionLabel: label,
      sanitizedLabel: sanitizeVersionLabel(label),
      namespace: mutated.type as Namespace,
    });
  }

  return { isVersioned: true, snapshots };
}
