import type { Children } from "@alloy-js/core";
import type { UnionVariant } from "@typespec/compiler";
import { TypeExpression } from "@typespec/emitter-framework/csharp";

/**
 * Override component for TypeSpec UnionVariant types.
 * Registered via Experimental_ComponentOverrides in emitter.tsx so that
 * all TypeExpression calls for union variants delegate to the variant's
 * underlying type (e.g. DogKind.Golden -> string).
 */
export function UnionVariantTypeExpression(props: {
  type: UnionVariant;
  default: Children;
}): Children {
  return <TypeExpression type={props.type.type} />;
}
