import type { Children } from "@alloy-js/core";
import type { IntrinsicType } from "@typespec/compiler";

/**
 * Override component for TypeSpec Intrinsic types (unknown, never, null).
 * Registered via Experimental_ComponentOverrides in emitter.tsx so that
 * all TypeExpression calls — including those inside emitter-framework's
 * ClassDeclaration/Property — map intrinsic types to valid C# types.
 */
export function IntrinsicTypeExpression(props: {
  type: IntrinsicType;
  default: Children;
}): Children {
  switch (props.type.name) {
    case "unknown":
      return <>object</>;
    case "never":
      return <>object</>;
    case "null":
      return <>null</>;
    default:
      return <>{props.default}</>;
  }
}
