import type { Children } from "@alloy-js/core";

// FIXME: Check if there's a better alternative for this in Alloy
export function csharpStringLiteral(value: Children): Children {
  return (
    <>
      {'"'}
      {value}
      {'"'}
    </>
  );
}
