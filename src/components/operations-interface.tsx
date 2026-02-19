import * as cs from "@alloy-js/csharp";
import { Threading } from "@alloy-js/csharp/global/System";
import { Tasks } from "@alloy-js/csharp/global/System/Threading";
import type { Children } from "@alloy-js/core";
import { For, refkey } from "@alloy-js/core";
import type { Model, Program } from "@typespec/compiler";
import { isVoidType } from "@typespec/compiler";
import type { HttpOperation, HttpPayloadBody } from "@typespec/http";
import type { OperationContainer } from "@typespec/http";
import { useTsp } from "@typespec/emitter-framework";
import { TypeExpression } from "@typespec/emitter-framework/csharp";
import type {
  ActionParameter,
  NamePolicyLike,
} from "../utils/operation-to-action.js";
import {
  getActionMethodInfo,
  getBodyType,
  getParamType,
} from "../utils/operation-to-action.js";
import type { VisibilityFilteredModel } from "../utils/visibility-analysis.js";
import { getVisibilityContextForVerb } from "../utils/visibility-analysis.js";

export interface OperationsInterfaceDeclarationProps {
  program: Program;
  container: OperationContainer;
  operations: HttpOperation[];
  namePolicy?: NamePolicyLike;
  visibilityLookup?: Map<string, VisibilityFilteredModel>;
}

function resolveBodyParamType(
  ap: ActionParameter,
  op: HttpOperation,
  visibilityLookup?: Map<string, VisibilityFilteredModel>,
): Children {
  if (ap.attribute !== "FromBody" || !("type" in ap.param)) {
    return <TypeExpression type={getParamType(ap).type} />;
  }

  const bodyType = getBodyType(ap.param as unknown as HttpPayloadBody);
  if (!bodyType) {
    return <TypeExpression type={getParamType(ap).type} />;
  }

  // Check if there's a visibility-filtered DTO for this body model + verb context
  if (visibilityLookup && bodyType.kind === "Model" && bodyType.name) {
    const context = getVisibilityContextForVerb(op.verb);
    const key = `${bodyType.name}:${context}`;
    const filtered = visibilityLookup.get(key);
    if (filtered) {
      return filtered.refkey as Children;
    }
  }

  return <TypeExpression type={bodyType} />;
}

function buildInterfaceMethodParams(
  info: { parameters: ActionParameter[] },
  op: HttpOperation,
  visibilityLookup?: Map<string, VisibilityFilteredModel>,
): Array<{ name: string; type: Children; default?: Children }> {
  return [
    ...info.parameters.map((ap) => ({
      name: ap.name,
      type: resolveBodyParamType(ap, op, visibilityLookup) as Children,
    })),
    {
      name: "cancellationToken",
      type: Threading.CancellationToken as Children,
      default: <>default</>,
    },
  ];
}

/**
 * Renders a C# operations interface (e.g. IUsers) for a group of HTTP operations.
 * Methods are async with Task/Task<T> and a trailing CancellationToken parameter.
 */
export function OperationsInterfaceDeclaration(
  props: OperationsInterfaceDeclarationProps,
): Children {
  const { program, container, operations, visibilityLookup } = props;
  const namePolicy = props.namePolicy ?? cs.useCSharpNamePolicy();
  const { $ } = useTsp();
  const interfaceName =
    "I" + namePolicy.getName(container.name ?? "Api", "class");
  const containerRoute = undefined; // only needed for action route, not for interface

  return (
    <cs.InterfaceDeclaration
      public
      name={interfaceName}
      refkey={refkey(container)}
    >
      <For each={operations} hardline>
        {(op) => {
          const info = getActionMethodInfo(
            program,
            op,
            containerRoute,
            namePolicy,
          );
          const methodName = info.operationName + "Async";
          const paramDescriptors = buildInterfaceMethodParams(
            info,
            op,
            visibilityLookup,
          );

          const returnType: Children = isVoidType(op.operation.returnType) ? (
            (Tasks.Task as Children)
          ) : (
            <cs.AccessExpression>
              <cs.AccessExpression.Part
                refkey={Tasks.Task}
                typeArgs={[<TypeExpression type={op.operation.returnType} />]}
              />
            </cs.AccessExpression>
          );

          const operationDoc = $.type.getDoc(op.operation);
          const doc = operationDoc ? (
            <cs.DocSummary>
              <cs.DocFromMarkdown markdown={operationDoc} />
            </cs.DocSummary>
          ) : undefined;

          return (
            <cs.InterfaceMethod
              public
              name={methodName}
              returns={returnType}
              parameters={paramDescriptors}
              doc={doc}
            />
          );
        }}
      </For>
    </cs.InterfaceDeclaration>
  );
}
