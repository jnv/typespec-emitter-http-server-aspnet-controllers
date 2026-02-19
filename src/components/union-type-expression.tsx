import type { Children } from "@alloy-js/core";
import type { Type, Union } from "@typespec/compiler";
import { TypeExpression } from "@typespec/emitter-framework/csharp";

/**
 * C# value-type scalar names that require `?` suffix for nullability.
 * Reference types (string, models, arrays) are nullable by default in C#.
 */
const VALUE_TYPE_SCALARS = new Set([
  "boolean",
  "int8",
  "int16",
  "int32",
  "int64",
  "uint8",
  "uint16",
  "uint32",
  "uint64",
  "safeint",
  "float32",
  "float64",
  "decimal",
  "decimal128",
  "numeric",
  "integer",
]);

function isValueTypeScalar(type: Type): boolean {
  return type.kind === "Scalar" && VALUE_TYPE_SCALARS.has(type.name ?? "");
}

function isNullVariant(type: Type): boolean {
  return type.kind === "Intrinsic" && type.name === "null";
}

function isVoidVariant(type: Type): boolean {
  return type.kind === "Intrinsic" && type.name === "void";
}

/**
 * Override component for TypeSpec Union types.
 * Registered via Experimental_ComponentOverrides in emitter.tsx so that
 * all TypeExpression calls map union types to valid C# types.
 *
 * Coalescing rules (mirrors the official http-server-csharp emitter):
 * - Filters out null/void variants (tracks nullability separately)
 * - Single non-null type: delegates to TypeExpression (nullable ? suffix for value types)
 * - All literal variants of same kind: collapses to base scalar type
 * - Multiple disparate types: falls back to object
 */
export function UnionTypeExpression(props: {
  type: Union;
  default: Children;
}): Children {
  const variants = [...props.type.variants.values()];

  const hasNull = variants.some((v) => isNullVariant(v.type));
  const nonNullVariants = variants.filter(
    (v) => !isNullVariant(v.type) && !isVoidVariant(v.type),
  );

  // No non-null types remaining
  if (nonNullVariants.length === 0) {
    return <>object</>;
  }

  // Single non-null type (nullable union T | null)
  if (nonNullVariants.length === 1) {
    const innerType = nonNullVariants[0].type;
    if (hasNull && isValueTypeScalar(innerType)) {
      return (
        <>
          <TypeExpression type={innerType} />?
        </>
      );
    }
    return <TypeExpression type={innerType} />;
  }

  // Check if all variants are literals of the same kind
  const kinds = new Set(nonNullVariants.map((v) => v.type.kind));
  if (kinds.size === 1) {
    const kind = nonNullVariants[0].type.kind;

    if (kind === "String") {
      return <>string</>;
    }
    if (kind === "Number") {
      return hasNull ? <>double?</> : <>double</>;
    }
    if (kind === "Boolean") {
      return hasNull ? <>bool?</> : <>bool</>;
    }
    // All same Scalar type — delegate to TypeExpression
    if (kind === "Scalar") {
      const innerType = nonNullVariants[0].type;
      if (hasNull && isValueTypeScalar(innerType)) {
        return (
          <>
            <TypeExpression type={innerType} />?
          </>
        );
      }
      return <TypeExpression type={innerType} />;
    }
  }

  // Mixed types or multiple models — fall back to object
  return <>object</>;
}
