import * as cs from "@alloy-js/csharp";
import { access } from "@alloy-js/csharp";
import { Threading } from "@alloy-js/csharp/global/System";
import { Tasks } from "@alloy-js/csharp/global/System/Threading";
import type { Children } from "@alloy-js/core";
import { code, For, List, refkey, Show, StatementList } from "@alloy-js/core";
import type { Program } from "@typespec/compiler";
import { isVoidType } from "@typespec/compiler";
import type { HttpOperation, HttpPayloadBody } from "@typespec/http";
import type { OperationContainer } from "@typespec/http";
import { useTsp } from "@typespec/emitter-framework";
import { TypeExpression } from "@typespec/emitter-framework/csharp";
import { AspNetMvc } from "../lib/aspnet-mvc.js";
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

// FIXME: Not if there's a better alternative for this in Alloy
function csharpStringLiteral(value: Children): Children {
  return (
    <>
      {'"'}
      {value}
      {'"'}
    </>
  );
}

/**
 * Renders an ASP.NET Core controller class for a group of HTTP operations (same container).
 * The controller injects the operations interface and delegates each action to it (mediator pattern).
 */
export function ControllerDeclaration(
  props: ControllerDeclarationProps,
): Children {
  const { program, container, operations } = props;
  const namePolicy = props.namePolicy ?? cs.useCSharpNamePolicy();
  const { $ } = useTsp();
  const containerClassName = namePolicy.getName(
    container.name ?? "Api",
    "class",
  );
  const controllerName = containerClassName + "Controller";
  const operationsFieldName = "_operations";
  const containerRoute = getContainerRoutePath(program, container);
  const routeTemplateValue = containerRoute?.replace(/^\//, "") ?? "controller";

  const constructorParam = {
    name: "operations",
    type: refkey(container) as Children,
  };

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
        ap.attribute === "FromBody" && "type" in ap.param ? (
          <TypeExpression
            type={getBodyType(ap.param as unknown as HttpPayloadBody)!}
          />
        ) : (
          <TypeExpression type={getParamType(ap).type} />
        );

      let attribute: Children | undefined;

      if (ap.attribute === "FromRoute") {
        attribute = <cs.Attribute name={AspNetMvc.FromRouteAttribute} />;
      } else if (ap.attribute === "FromQuery") {
        attribute = <cs.Attribute name={AspNetMvc.FromQueryAttribute} />;
      } else if (ap.attribute === "FromBody") {
        attribute = <cs.Attribute name={AspNetMvc.FromBodyAttribute} />;
      } else if (ap.attribute === "FromHeader") {
        attribute = ap.headerName ? (
          <cs.Attribute name={AspNetMvc.FromHeaderAttribute} args={[ap.headerName]} />
        ) : (
          <cs.Attribute name={AspNetMvc.FromHeaderAttribute} />
        );
      }

      paramDescriptors.push({
        name: ap.name,
        type,
        attributes: attribute ? [attribute] : undefined,
      });
    }
    paramDescriptors.push({
      name: "cancellationToken",
      type: Threading.CancellationToken as Children,
      attributes: undefined,
    });

    const returnType: Children = isVoidType(op.operation.returnType) ? (
      <cs.AccessExpression>
        <cs.AccessExpression.Part
          refkey={Tasks.Task}
          typeArgs={[AspNetMvc.IActionResult as Children]}
        />
      </cs.AccessExpression>
    ) : (
      <cs.AccessExpression>
        <cs.AccessExpression.Part
          refkey={Tasks.Task}
          typeArgs={[
            <cs.AccessExpression>
              <cs.AccessExpression.Part
                refkey={AspNetMvc.ActionResult}
                typeArgs={[<TypeExpression type={op.operation.returnType} />]}
              />
            </cs.AccessExpression>,
          ]}
        />
      </cs.AccessExpression>
    );

    const verbAttr = (
      <Show
        when={!!info.actionRoute}
        fallback={<cs.Attribute name={info.verbAttribute} />}
      >
        <cs.Attribute
          name={info.verbAttribute}
          args={[csharpStringLiteral(info.actionRoute)]}
        />
      </Show>
    );

    const methodNameAsync = info.operationName + "Async";
    const argNames: Children[] = [
      ...info.parameters.map((p) => p.name),
      "cancellationToken",
    ];
    const hasReturn = !isVoidType(op.operation.returnType);
    const hasResponseHeaders = hasReturn && info.responseHeaders.length > 0;

    const headerStatements = (
      <For each={info.responseHeaders} hardline>
        {(h) => {
          const resultProp = access("result").member(h.csharpPropertyName);
          const headerAssign = (
            <>
              {access("Response")
                .member("Headers")
                .index([csharpStringLiteral(h.httpHeaderName)])}{" "}
              = {resultProp}
            </>
          );

          return (
            <Show when={h.isOptional} fallback={<>{headerAssign};</>}>
              <cs.IfStatement condition={<>{resultProp} != null</>}>
                {headerAssign};
              </cs.IfStatement>
            </Show>
          );
        }}
      </For>
    );

    const serviceCall = access(operationsFieldName).call(
      methodNameAsync,
      argNames,
    );

    const methodBody: Children = (
      <Show
        when={hasReturn}
        fallback={
          <StatementList>
            <>await {serviceCall}</>
            {code`return NoContent()`}
          </StatementList>
        }
      >
        <List hardline>
          <cs.VarDeclaration name="result">
            await {serviceCall}
          </cs.VarDeclaration>
          <Show when={hasResponseHeaders}>{headerStatements}</Show>
          {code`return Ok(result);`}
        </List>
      </Show>
    );

    const operationDoc = $.type.getDoc(op.operation);
    const doc = operationDoc ? (
      <cs.DocSummary>
        <cs.DocFromMarkdown markdown={operationDoc} />
      </cs.DocSummary>
    ) : undefined;

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
      baseType={AspNetMvc.ControllerBase as Children}
      attributes={[
        <cs.Attribute name={AspNetMvc.ApiControllerAttribute} />,
        <cs.Attribute
          name={AspNetMvc.RouteAttribute}
          args={[csharpStringLiteral(routeTemplateValue)]}
        />,
      ]}
    >
      <List doubleHardline>
        <cs.Field
          private
          readonly
          name={operationsFieldName}
          type={refkey(container) as Children}
        />
        <cs.Constructor public parameters={[constructorParam]}>
          {code`${operationsFieldName} = operations;`}
        </cs.Constructor>
        <List hardline>{methods}</List>
      </List>
    </cs.ClassDeclaration>
  );
}
