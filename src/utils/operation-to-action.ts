import type { Program } from "@typespec/compiler";
import { getRoutePath } from "@typespec/http";
import type {
  HttpOperation,
  HttpOperationParameter,
  HttpOperationParameters,
  HttpPayloadBody,
  HttpVerb,
} from "@typespec/http";
import type { OperationContainer } from "@typespec/http";

export interface NamePolicyLike {
  getName(name: string, element: string | undefined): string;
}

export interface ActionParameter {
  name: string;
  attribute?: "FromRoute" | "FromQuery" | "FromBody" | "FromHeader";
  headerName?: string;
  param: HttpOperationParameter;
}

/** Get the TypeSpec type for an action parameter (route/query/header/body). */
export function getParamType(param: ActionParameter): { type: import("@typespec/compiler").Type } {
  const p = param.param as unknown as {
    param?: { type: import("@typespec/compiler").Type };
    type?: import("@typespec/compiler").Type;
  };
  if (p.param?.type) return { type: p.param.type };
  if (p.type) return { type: p.type };
  throw new Error("Unknown parameter shape");
}

/** Get the body type from HttpPayloadBody when present. */
export function getBodyType(
  body: HttpPayloadBody,
): import("@typespec/compiler").Type | undefined {
  if ("type" in body && body.type) {
    return body.type as import("@typespec/compiler").Type;
  }
  return undefined;
}

export interface ActionMethodInfo {
  operationName: string;
  verb: HttpVerb;
  verbAttribute: string;
  actionRoute: string;
  parameters: ActionParameter[];
  hasBody: boolean;
}

const verbToAttribute: Record<HttpVerb, string> = {
  get: "HttpGet",
  post: "HttpPost",
  put: "HttpPut",
  patch: "HttpPatch",
  delete: "HttpDelete",
  head: "HttpHead",
};

/**
 * Get the HTTP verb attribute name for ASP.NET (e.g. "HttpGet").
 */
export function getVerbAttribute(verb: HttpVerb): string {
  return verbToAttribute[verb];
}

/**
 * Get the action route template relative to the controller route.
 * Controller route e.g. "/users", operation path "/users/{id}" -> "{id}".
 */
export function getActionRoute(
  program: Program,
  operation: HttpOperation,
  containerRoute: string | undefined,
): string {
  const opPath = operation.path;
  const base = containerRoute ?? "";
  const baseNorm = base.replace(/\/$/, "") || "/";
  if (opPath === baseNorm || opPath === base || opPath.startsWith(baseNorm + "/")) {
    const suffix = opPath.slice(baseNorm.length).replace(/^\//, "");
    return suffix;
  }
  return opPath.replace(/^\//, "");
}

/**
 * Build action method info: verb attribute, action route, and parameters with binding attributes.
 */
export function getActionMethodInfo(
  program: Program,
  operation: HttpOperation,
  containerRoute: string | undefined,
  namePolicy: NamePolicyLike,
): ActionMethodInfo {
  const parameters: ActionParameter[] = [];

  for (const p of operation.parameters.parameters) {
    const paramName = namePolicy.getName(p.param.name, "parameter");
    if (p.type === "path") {
      parameters.push({ name: paramName, attribute: "FromRoute", param: p });
    } else if (p.type === "query") {
      parameters.push({ name: paramName, attribute: "FromQuery", param: p });
    } else if (p.type === "header") {
      parameters.push({
        name: paramName,
        attribute: "FromHeader",
        headerName: p.name,
        param: p,
      });
    } else if (p.type === "cookie") {
      parameters.push({
        name: paramName,
        attribute: "FromHeader",
        headerName: "Cookie",
        param: p,
      });
    }
  }

  const body = operation.parameters.body;
  if (body) {
    const bodyParamName = getBodyParameterName(body, namePolicy);
    parameters.push({
      name: bodyParamName,
      attribute: "FromBody",
      param: body as unknown as HttpOperationParameter,
    });
  }

  const operationName = namePolicy.getName(operation.operation.name, "class-method");
  const verbAttribute = getVerbAttribute(operation.verb);
  const actionRoute = getActionRoute(program, operation, containerRoute);

  return {
    operationName,
    verb: operation.verb,
    verbAttribute,
    actionRoute,
    parameters,
    hasBody: !!body,
  };
}

function getBodyParameterName(
  body: HttpPayloadBody,
  namePolicy: NamePolicyLike,
): string {
  if ("property" in body && body.property) {
    return namePolicy.getName(body.property.name, "parameter");
  }
  return "body";
}

/**
 * Group HTTP operations by their container (interface or namespace) so we emit one controller per container.
 */
export function groupOperationsByContainer(
  operations: HttpOperation[],
): Map<OperationContainer, HttpOperation[]> {
  const map = new Map<OperationContainer, HttpOperation[]>();
  for (const op of operations) {
    const container = op.container;
    let list = map.get(container);
    if (!list) {
      list = [];
      map.set(container, list);
    }
    list.push(op);
  }
  return map;
}

/**
 * Get the route path for a container (interface or namespace) for use as controller [Route].
 */
export function getContainerRoutePath(
  program: Program,
  container: OperationContainer,
): string | undefined {
  return getRoutePath(program, container)?.path;
}
