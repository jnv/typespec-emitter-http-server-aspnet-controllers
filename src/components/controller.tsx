import * as cs from "@alloy-js/csharp";
import type { Children } from "@alloy-js/core";
import type { Program } from "@typespec/compiler";
import { isVoidType } from "@typespec/compiler";
import type { HttpOperation, HttpPayloadBody } from "@typespec/http";
import type { OperationContainer } from "@typespec/http";
import { TypeExpression } from "@typespec/emitter-framework/csharp";
import {
  getActionMethodInfo,
  getContainerRoutePath,
  type ActionParameter,
  type NamePolicyLike,
} from "../utils/operation-to-action.js";

export interface ControllerDeclarationProps {
  program: Program;
  container: OperationContainer;
  operations: HttpOperation[];
  namePolicy?: NamePolicyLike;
}

function getParamType(param: ActionParameter): { type: import("@typespec/compiler").Type } {
  const p = param.param as unknown as { param?: { type: import("@typespec/compiler").Type }; type?: import("@typespec/compiler").Type };
  if (p.param?.type) return { type: p.param.type };
  if (p.type) return { type: p.type };
  throw new Error("Unknown parameter shape");
}

function getBodyType(body: HttpPayloadBody): import("@typespec/compiler").Type | undefined {
  if ("type" in body && body.type) {
    return body.type as import("@typespec/compiler").Type;
  }
  return undefined;
}

/**
 * Renders an ASP.NET Core controller class for a group of HTTP operations (same container).
 */
export function ControllerDeclaration(props: ControllerDeclarationProps): Children {
  const { program, container, operations } = props;
  const namePolicy = props.namePolicy ?? cs.useCSharpNamePolicy();
  const controllerName =
    namePolicy.getName(container.name ?? "Api", "class") + "Controller";
  const containerRoute = getContainerRoutePath(program, container);
  const routeTemplateValue = containerRoute?.replace(/^\//, "") ?? "controller";
  const routeTemplateArg: Children = (
    <>{"\""}{routeTemplateValue}{"\""}</>
  );

  const methods: Children[] = [];

  for (const op of operations) {
    const info = getActionMethodInfo(program, op, containerRoute, namePolicy);

    const paramDescriptors: Array<{
      name: string;
      type: Children;
      attributes?: cs.AttributesProp;
    }> = [];

    for (const ap of info.parameters) {
      const type =
        ap.attribute === "FromBody" && "type" in ap.param
          ? <TypeExpression type={getBodyType(ap.param as unknown as HttpPayloadBody)!} />
          : <TypeExpression type={getParamType(ap).type} />;
      const attrs: cs.AttributesProp = [];
      if (ap.attribute === "FromRoute") {
        attrs.push(<cs.Attribute name="FromRoute" />);
      } else if (ap.attribute === "FromQuery") {
        attrs.push(<cs.Attribute name="FromQuery" />);
      } else if (ap.attribute === "FromBody") {
        attrs.push(<cs.Attribute name="FromBody" />);
      } else if (ap.attribute === "FromHeader" && ap.headerName) {
        attrs.push(<cs.Attribute name="FromHeader" args={[ap.headerName]} />);
      } else if (ap.attribute === "FromHeader") {
        attrs.push(<cs.Attribute name="FromHeader" />);
      }
      paramDescriptors.push({
        name: ap.name,
        type,
        attributes: attrs.length ? attrs : undefined,
      });
    }

    const returnType: Children = isVoidType(op.operation.returnType)
      ? "IActionResult"
      : <>{"ActionResult<"} <TypeExpression type={op.operation.returnType} /> {">"}</>;

    const verbAttr = info.actionRoute
      ? (
        <cs.Attribute
          name={info.verbAttribute}
          args={[<>{"\""}{info.actionRoute}{"\""}</>]}
        />
      )
      : <cs.Attribute name={info.verbAttribute} />;

    const expressionBody = isVoidType(op.operation.returnType)
      ? "NoContent()"
      : "Ok(default)";

    methods.push(
      <cs.Method
        public
        name={info.operationName}
        returns={returnType}
        parameters={paramDescriptors.map((p) => ({
          name: p.name,
          type: p.type,
          attributes: p.attributes,
        }))}
        attributes={[verbAttr]}
        expression
      >
        {expressionBody}
      </cs.Method>,
    );
  }

  return (
    <cs.ClassDeclaration
      public
      name={controllerName}
      baseType={<>ControllerBase</>}
      attributes={[
        <cs.Attribute name="ApiController" />,
        <cs.Attribute name="Route" args={[routeTemplateArg]} />,
      ]}
    >
      {methods}
    </cs.ClassDeclaration>
  );
}
