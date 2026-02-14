import * as cs from "@alloy-js/csharp";
import { Tasks } from "@alloy-js/csharp/global/System/Threading";
import type { Children } from "@alloy-js/core";
import { code, For, List, refkey, Show } from "@alloy-js/core";
import type { Program } from "@typespec/compiler";
import { isVoidType } from "@typespec/compiler";
import type { HttpOperation } from "@typespec/http";
import type { OperationContainer } from "@typespec/http";
import { useTsp } from "@typespec/emitter-framework";
import { TypeExpression } from "@typespec/emitter-framework/csharp";
import { AspNetMvc } from "../../lib/aspnet-mvc.js";
import type { NamePolicyLike } from "../../utils/operation-to-action.js";
import {
  getActionMethodInfo,
  getContainerRoutePath,
} from "../../utils/operation-to-action.js";
import { ActionMethodBody } from "./action-method-body.jsx";
import { buildControllerParams } from "./build-controller-params.jsx";
import { csharpStringLiteral } from "./csharp-string-literal.jsx";

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
  const operationsFieldName = namePolicy.getName(
    "operations",
    "class-member-private",
  );
  const containerRoute = getContainerRoutePath(program, container);
  const routeTemplateValue = containerRoute?.replace(/^\//, "") ?? "controller";

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
        <cs.Constructor
          public
          parameters={[
            { name: "operations", type: refkey(container) as Children },
          ]}
        >
          {code`${operationsFieldName} = operations;`}
        </cs.Constructor>
        <For each={operations} doubleHardline>
          {(op) => {
            const info = getActionMethodInfo(
              program,
              op,
              containerRoute,
              namePolicy,
            );
            const paramDescriptors = buildControllerParams(info);
            const hasReturn = !isVoidType(op.operation.returnType);

            const returnType: Children = !hasReturn ? (
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
                        typeArgs={[
                          <TypeExpression type={op.operation.returnType} />,
                        ]}
                      />
                    </cs.AccessExpression>,
                  ]}
                />
              </cs.AccessExpression>
            );

            const operationDoc = $.type.getDoc(op.operation);

            return (
              <cs.Method
                public
                virtual
                async
                name={info.operationName}
                returns={returnType}
                parameters={paramDescriptors}
                doc={
                  operationDoc && (
                    <cs.DocSummary>
                      <cs.DocFromMarkdown markdown={operationDoc} />
                    </cs.DocSummary>
                  )
                }
                attributes={[
                  <Show
                    when={Boolean(info.actionRoute)}
                    fallback={<cs.Attribute name={info.verbAttribute} />}
                  >
                    <cs.Attribute
                      name={info.verbAttribute}
                      args={[csharpStringLiteral(info.actionRoute)]}
                    />
                  </Show>,
                ]}
              >
                <ActionMethodBody
                  info={info}
                  operationsFieldName={operationsFieldName}
                  hasReturn={hasReturn}
                />
              </cs.Method>
            );
          }}
        </For>
      </List>
    </cs.ClassDeclaration>
  );
}
