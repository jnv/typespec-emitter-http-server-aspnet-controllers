import type { Namespace } from "@typespec/compiler";
import { isStdNamespace } from "@typespec/compiler";
import type { Program } from "@typespec/compiler";
import { getAllHttpServices, getHttpService } from "@typespec/http";
import type { HttpOperation, HttpService } from "@typespec/http";

/**
 * Collects HTTP operations from a namespace and its non-std sub-namespaces
 * (getHttpService(program, globalNs) uses recursive: false, so we recurse manually).
 */
function collectOperationsFromNamespaceTree(
  program: Program,
  namespace: Namespace,
  operations: HttpOperation[],
  diagnostics: unknown[],
): void {
  const [service, diag] = getHttpService(program, namespace);
  if (diag && Array.isArray(diag)) diagnostics.push(...diag);
  operations.push(...service.operations);
  for (const subNs of namespace.namespaces.values()) {
    if (!isStdNamespace(subNs)) {
      collectOperationsFromNamespaceTree(program, subNs, operations, diagnostics);
    }
  }
}

/**
 * Returns all HTTP services for the program.
 * If no @service is defined, returns a single service for the global namespace
 * and its sub-namespaces so that operations in nested namespaces and interfaces
 * (e.g. namespace Api { @route("/") interface Foo { ... } }) are still emitted.
 */
export function getHttpServices(program: Program): [HttpService[], readonly unknown[]] {
  const [services, diagnostics] = getAllHttpServices(program);
  if (services.length === 0) {
    const globalNs = program.getGlobalNamespaceType();
    const [globalService, globalDiag] = getHttpService(program, globalNs);
    const allDiag = Array.isArray(globalDiag) ? [...globalDiag] : [];
    const allOperations = [...globalService.operations];
    for (const subNs of globalNs.namespaces.values()) {
      if (!isStdNamespace(subNs)) {
        collectOperationsFromNamespaceTree(program, subNs, allOperations, allDiag);
      }
    }
    const mergedService: HttpService = {
      ...globalService,
      operations: allOperations,
    };
    return [[mergedService], allDiag];
  }
  return [services, diagnostics];
}
