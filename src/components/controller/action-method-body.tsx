import * as cs from "@alloy-js/csharp";
import { access } from "@alloy-js/csharp";
import type { Children } from "@alloy-js/core";
import { code, For, List, Show, StatementList } from "@alloy-js/core";
import type {
  ActionMethodInfo,
  ResponseHeaderInfo,
} from "../../utils/operation-to-action.js";
import { csharpStringLiteral } from "./csharp-string-literal.jsx";

interface ResponseHeaderStatementsProps {
  headers: ResponseHeaderInfo[];
}

/**
 * Renders statements that copy response headers from the result object
 * to the HTTP response. Optional headers get a null-check guard.
 */
function ResponseHeaderStatements(
  props: ResponseHeaderStatementsProps,
): Children {
  return (
    <For each={props.headers} hardline>
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
}

export interface ActionMethodBodyProps {
  info: ActionMethodInfo;
  operationsFieldName: string;
  hasReturn: boolean;
}

/**
 * Renders the body of a controller action method: calls the operations
 * interface, optionally sets response headers, and returns the result.
 */
export function ActionMethodBody(props: ActionMethodBodyProps): Children {
  const { info, operationsFieldName, hasReturn } = props;
  const methodNameAsync = info.operationName + "Async";
  const argNames: Children[] = [
    ...info.parameters.map((p) => p.name),
    "cancellationToken",
  ];
  const hasResponseHeaders = hasReturn && info.responseHeaders.length > 0;
  const serviceCall = access(operationsFieldName).call(
    methodNameAsync,
    argNames,
  );

  return (
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
        <Show when={hasResponseHeaders}>
          <ResponseHeaderStatements headers={info.responseHeaders} />
        </Show>
        {code`return Ok(result);`}
      </List>
    </Show>
  );
}
