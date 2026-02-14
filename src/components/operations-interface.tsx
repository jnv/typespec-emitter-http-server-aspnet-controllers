import * as cs from "@alloy-js/csharp";
import { Threading } from "@alloy-js/csharp/global/System";
import { Tasks } from "@alloy-js/csharp/global/System/Threading";
import type { Children } from "@alloy-js/core";
import { List, refkey, Show } from "@alloy-js/core";
import type { Program } from "@typespec/compiler";
import { isVoidType } from "@typespec/compiler";
import type { HttpOperation, HttpPayloadBody } from "@typespec/http";
import type { OperationContainer } from "@typespec/http";
import { useTsp } from "@typespec/emitter-framework";
import { TypeExpression } from "@typespec/emitter-framework/csharp";
import type { ActionParameter, NamePolicyLike } from "../utils/operation-to-action.js";
import {
  getActionMethodInfo,
  getBodyType,
  getParamType,
} from "../utils/operation-to-action.js";

export interface OperationsInterfaceDeclarationProps {
  program: Program;
  container: OperationContainer;
  operations: HttpOperation[];
  namePolicy?: NamePolicyLike;
}

function buildInterfaceMethodParams(
  info: { parameters: ActionParameter[] },
): Array<{ name: string; type: Children; default?: Children }> {
  const params: Array<{ name: string; type: Children; default?: Children }> = [];
  for (const ap of info.parameters) {
    const type =
      ap.attribute === "FromBody" && "type" in ap.param
        ? <TypeExpression type={getBodyType(ap.param as unknown as HttpPayloadBody)!} />
        : <TypeExpression type={getParamType(ap).type} />;
    params.push({ name: ap.name, type });
  }
  params.push({
    name: "cancellationToken",
    type: Threading.CancellationToken as Children,
    default: <>default</>,
  });
  return params;
}

/**
 * Renders a C# operations interface (e.g. IUsers) for a group of HTTP operations.
 * Methods are async with Task/Task<T> and a trailing CancellationToken parameter.
 */
export function OperationsInterfaceDeclaration(
  props: OperationsInterfaceDeclarationProps,
): Children {
  const { program, container, operations } = props;
  const namePolicy = props.namePolicy ?? cs.useCSharpNamePolicy();
  const { $ } = useTsp();
  const interfaceName = "I" + namePolicy.getName(container.name ?? "Api", "class");
  const containerRoute = undefined; // only needed for action route, not for interface

  const methods: Children[] = [];

  for (const op of operations) {
    const info = getActionMethodInfo(program, op, containerRoute, namePolicy);
    const methodName = info.operationName + "Async";

    const paramDescriptors = buildInterfaceMethodParams(info);

    const returnType: Children = isVoidType(op.operation.returnType)
      ? (Tasks.Task as Children)
      : (
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

    methods.push(
      <cs.InterfaceMethod
        public
        name={methodName}
        returns={returnType}
        parameters={paramDescriptors.map((p) => ({
          name: p.name,
          type: p.type,
          default: p.default,
        }))}
        doc={doc}
      />,
    );
  }

  return (
    <cs.InterfaceDeclaration public name={interfaceName} refkey={refkey(container)}>
      <List hardline>
        {methods}
      </List>
    </cs.InterfaceDeclaration>
  );
}
