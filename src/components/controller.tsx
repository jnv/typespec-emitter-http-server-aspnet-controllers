import * as cs from "@alloy-js/csharp";
import type { Children } from "@alloy-js/core";
import { code, List } from "@alloy-js/core";
import type { Program } from "@typespec/compiler";
import { isVoidType } from "@typespec/compiler";
import type { HttpOperation, HttpPayloadBody } from "@typespec/http";
import type { OperationContainer } from "@typespec/http";
import { useTsp } from "@typespec/emitter-framework";
import { TypeExpression } from "@typespec/emitter-framework/csharp";
import type { NamePolicyLike } from "../utils/operation-to-action.js";
import {
  getActionMethodInfo,
  getBodyType,
  getContainerRoutePath,
  getParamType,
} from "../utils/operation-to-action.js";

export interface ControllerDeclarationProps {
  program: Program;
  container: OperationContainer;
  operations: HttpOperation[];
  namePolicy?: NamePolicyLike;
}

/**
 * Renders an ASP.NET Core controller class for a group of HTTP operations (same container).
 * The controller injects the operations interface and delegates each action to it (mediator pattern).
 */
export function ControllerDeclaration(props: ControllerDeclarationProps): Children {
  const { program, container, operations } = props;
  const namePolicy = props.namePolicy ?? cs.useCSharpNamePolicy();
  const { $ } = useTsp();
  const containerClassName = namePolicy.getName(container.name ?? "Api", "class");
  const controllerName = containerClassName + "Controller";
  const interfaceName = "I" + containerClassName;
  const operationsFieldName = "_operations";
  const containerRoute = getContainerRoutePath(program, container);
  const routeTemplateValue = containerRoute?.replace(/^\//, "") ?? "controller";
  const routeTemplateArg: Children = (
    <>{"\""}{routeTemplateValue}{"\""}</>
  );

  const constructorParam = { name: "operations", type: interfaceName as Children };

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
    paramDescriptors.push({
      name: "cancellationToken",
      type: "CancellationToken" as Children,
      attributes: undefined,
    });

    const returnType: Children = isVoidType(op.operation.returnType)
      ? "Task<IActionResult>"
      : <>{"Task<ActionResult<"} <TypeExpression type={op.operation.returnType} /> {">>"}</>;

    const verbAttr = info.actionRoute
      ? (
        <cs.Attribute
          name={info.verbAttribute}
          args={[<>{"\""}{info.actionRoute}{"\""}</>]}
        />
      )
      : <cs.Attribute name={info.verbAttribute} />;

    const methodNameAsync = info.operationName + "Async";
    const argList = [...info.parameters.map((p) => p.name), "cancellationToken"].join(", ");
    const hasReturn = !isVoidType(op.operation.returnType);
    const methodBody: Children = hasReturn
      ? code`var result = await ${operationsFieldName}.${methodNameAsync}(${argList});
return Ok(result);`
      : code`await ${operationsFieldName}.${methodNameAsync}(${argList});
return NoContent();`;

    const operationDoc = $.type.getDoc(op.operation);
    const doc =
      operationDoc ?
        (
          <cs.DocSummary>
            <cs.DocFromMarkdown markdown={operationDoc} />
          </cs.DocSummary>
        )
      : undefined;

    methods.push(
      <cs.Method
        public
        virtual
        async
        name={info.operationName}
        returns={returnType}
        parameters={paramDescriptors.map((p) => ({
          name: p.name,
          type: p.type,
          attributes: p.attributes,
        }))}
        attributes={[verbAttr]}
        doc={doc}
      >
        {methodBody}
      </cs.Method>,
    );
  }

  return (
    <cs.ClassDeclaration
      public
      partial
      name={controllerName}
      baseType={<>ControllerBase</>}
      attributes={[
        <cs.Attribute name="ApiController" />,
        <cs.Attribute name="Route" args={[routeTemplateArg]} />,
      ]}
    >
      <List doubleHardline>
        <cs.Field private readonly name={operationsFieldName} type={interfaceName as Children} />
        <cs.Constructor public parameters={[constructorParam]}>
          {code`${operationsFieldName} = operations;`}
        </cs.Constructor>
        <List hardline>
          {methods}
        </List>
      </List>
    </cs.ClassDeclaration>
  );
}
