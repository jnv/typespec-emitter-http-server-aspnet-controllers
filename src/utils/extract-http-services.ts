import type { Namespace, Operation } from "@typespec/compiler";
import { isStdNamespace } from "@typespec/compiler";
import type { Program } from "@typespec/compiler";
import { getHttpService } from "@typespec/http";
import type { HttpOperation, HttpService } from "@typespec/http";

/**
 * Collects HTTP operations from a namespace and its non-std sub-namespaces.
 * Deduplicates by operation identity to avoid double-counting when
 * getHttpService recurses internally.
 */
function collectOperationsFromNamespaceTree(
  program: Program,
  namespace: Namespace,
  operations: HttpOperation[],
  seen: Set<Operation>,
  diagnostics: unknown[],
): void {
  const [service, diag] = getHttpService(program, namespace);
  if (diag && Array.isArray(diag)) diagnostics.push(...diag);
  for (const op of service.operations) {
    if (!seen.has(op.operation)) {
      seen.add(op.operation);
      operations.push(op);
    }
  }
  for (const subNs of namespace.namespaces.values()) {
    if (!isStdNamespace(subNs)) {
      collectOperationsFromNamespaceTree(program, subNs, operations, seen, diagnostics);
    }
  }
}

/**
 * Returns all HTTP services for the program.
 * Always walks the global namespace and its sub-namespaces to find all HTTP
 * operations, including those in nested namespaces (e.g.
 * namespace AutomationHubGateway.Api { @route("/") interface Foo { ... } }).
 */
export function getHttpServices(program: Program): [HttpService[], readonly unknown[]] {
  const globalNs = program.getGlobalNamespaceType();
  const [globalService, globalDiag] = getHttpService(program, globalNs);
  const allDiag = Array.isArray(globalDiag) ? [...globalDiag] : [];
  const seen = new Set<Operation>();
  const allOperations: HttpOperation[] = [];
  for (const op of globalService.operations) {
    seen.add(op.operation);
    allOperations.push(op);
  }
  for (const subNs of globalNs.namespaces.values()) {
    if (!isStdNamespace(subNs)) {
      collectOperationsFromNamespaceTree(program, subNs, allOperations, seen, allDiag);
    }
  }
  const mergedService: HttpService = {
    ...globalService,
    operations: allOperations,
  };
  return [[mergedService], allDiag];
}
