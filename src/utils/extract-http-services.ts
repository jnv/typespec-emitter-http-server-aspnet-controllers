import type { Program } from "@typespec/compiler";
import { getAllHttpServices, getHttpService } from "@typespec/http";
import type { HttpService } from "@typespec/http";

/**
 * Returns all HTTP services for the program.
 * If no @service is defined, returns a single service for the global namespace
 * so that operations in interfaces (e.g. @route("/users") interface Users) are still emitted.
 */
export function getHttpServices(program: Program): [HttpService[], readonly unknown[]] {
  const [services, diagnostics] = getAllHttpServices(program);
  if (services.length === 0) {
    const [globalService, globalDiag] = getHttpService(
      program,
      program.getGlobalNamespaceType(),
    );
    return [[globalService], globalDiag];
  }
  return [services, diagnostics];
}
