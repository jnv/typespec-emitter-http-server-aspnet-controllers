# Agent instructions

## Purpose

This project is a **TypeSpec code emitter** for ASP.NET Core servers. It consumes TypeSpec (`.tsp`) API definitions and emits:

- **C# models** (POCOs)
- **Controllers** (API endpoints)

## Stack

| Layer | Technology | Role |
|-------|------------|------|
| **Spec / compiler** | [TypeSpec](https://typespec.io/) (`@typespec/compiler`, `@typespec/http`) | Defines the API (models, operations); compiler provides the program AST and emit hooks. |
| **Emitter framework** | [@typespec/emitter-framework](https://github.com/microsoft/typespec/tree/main/packages/emitter-framework) | Base for emitters: `Output`, `writeOutput`, C# helpers like `ClassDeclaration`, name policies, output layout. |
| **C# / JSX output** | [@alloy-js/core](https://www.npmjs.com/package/@alloy-js/core), [@alloy-js/csharp](https://www.npmjs.com/package/@alloy-js/csharp) | Declarative C# code generation (JSX-style API): type declarations, members, attributes, project structure — `Namespace`, `SourceFile`, C# name policy. |
| **Library / build** | [@alloy-js/cli](https://www.npmjs.com/package/@alloy-js/cli), [@alloy-js/rollup-plugin](https://www.npmjs.com/package/@alloy-js/rollup-plugin) | Build and bundle the emitter (`alloy build`, Rollup + Babel for TS/JSX). |
| **Runtime / tests** | Node (ESM), [Vitest](https://vitest.dev/) | Run emitter as a TypeSpec library; tests use `@typespec/compiler/testing` and the local emitter. |
| **Output** | C# (ASP.NET Core) | Generated code targets .NET (e.g. ASP.NET Core) — models today; controllers later. |

## Code style

- **No inline type imports**  
  Do not use inline type imports (e.g. `import("@typespec/compiler").Type`). Use top-level `import type { Type } from "..."` at the top of the file and refer to the type by name.
- **Separate type and value imports**  
  Use separate statements for type-only and value imports. Prefer `import type { X } from "..."` for types and `import { a, b } from "..."` for values; do not mix `type X` and value bindings in the same `import` (e.g. avoid `import { type Children, List }`).

## Preferences for agents

When extending or modifying the emitter, follow this order of preference:

- **Emitter-framework first**  
  Prefer components from `@typespec/emitter-framework` and `@typespec/emitter-framework/csharp` before writing custom emission logic. The C# subpackage is not fully documented but is part of the framework; use it when it fits. From `@typespec/emitter-framework/csharp`: `ClassDeclaration`, `TypeExpression`, `Property`, `EnumDeclaration`, `JsonConverter`, `JsonConverterResolver`.
- **Typekits before custom reflection**  
  For TypeSpec type/model/operation reflection, use typekits (`$` from `@typespec/compiler/typekit` or `useTsp()` from `@typespec/emitter-framework`) before writing custom traversal or type checks. If using HTTP metadata, add `import "@typespec/http/experimental/typekit"` so HTTP typekits are available.
- **Alloy C# before strings**  
  For C# structure (classes, methods, properties, attributes, namespaces, files), prefer `@alloy-js/csharp` components (e.g. `cs.ClassDeclaration`, `cs.Method`, `cs.Property`, `cs.Attribute`, `cs.Namespace`, `cs.SourceFile`) over building C# with template literals or string concatenation.

References: [Emitter framework](https://typespec.io/docs/extending-typespec/emitter-framework/), [Typekits API](https://typespec.io/docs/standard-library/reference/typekits/); [TypeSpec overview](https://deepwiki.com/microsoft/typespec/), [Alloy overview](https://deepwiki.com/alloy-framework/alloy), [Alloy C# package](https://deepwiki.com/alloy-framework/alloy/5-c-package).

### Alloy C# components

When building C# output with `@alloy-js/csharp`, use these building blocks (full reference: Alloy overview and Alloy C# package in References above):

- **Project structure**: `Namespace`, `SourceFile` (`path`, `using`), `UsingDirective`; optionally `CsprojFile` for .csproj.
- **Type declarations**: `ClassDeclaration`, `StructDeclaration`, `RecordDeclaration`, `InterfaceDeclaration`, `EnumDeclaration`. This project uses emitter-framework’s `ClassDeclaration`/`EnumDeclaration` for models/enums; use `cs.ClassDeclaration` for custom types (e.g. controllers).
- **Members**: `Method`, `Property`, `Field`, `Constructor`.
- **Attributes**: `Attribute`, `Attributes`.
- **Naming**: `createCSharpNamePolicy()` / `useCSharpNamePolicy()`; pass element type (e.g. `"class"`, `"enum"`) to `getName()`.
- **Documentation** (when needed): `DocComment`, `FromMarkdown`, `Region`.

### Declarative patterns with Alloy Core

When building JSX-based emitters, prefer declarative patterns from `@alloy-js/core` over imperative JavaScript:

- **Conditional rendering**: Use `<Show when={condition}>` instead of `{condition && ...}` or ternaries for JSX rendering.
  ```tsx
  // Prefer this:
  <Show when={hasValue} fallback={<DefaultComponent />}>
    <ValueComponent />
  </Show>

  // Over this:
  {hasValue ? <ValueComponent /> : <DefaultComponent />}
  {hasValue && <ValueComponent />}
  ```

- **Multi-way conditionals**: Use `<Switch>` with `<Match>` for multiple conditions.
  ```tsx
  <Switch>
    <Match when={condition1}>
      <Component1 />
    </Match>
    <Match when={condition2}>
      <Component2 />
    </Match>
    <Match else>
      <DefaultComponent />
    </Match>
  </Switch>
  ```

- **When ternaries are acceptable**: For simple value assignment (not JSX rendering), ternaries are fine and often clearer:
  ```tsx
  const doc = operationDoc ? <cs.DocSummary>...</cs.DocSummary> : undefined;
  ```

- **Imperative logic**: Use standard JavaScript for building up data structures, accumulating values, or complex logic that doesn't involve JSX rendering. Not everything needs to be declarative.

**Examples in this codebase**:
- `src/emitter.tsx`: Uses `<Show>` to conditionally render controller/operations namespaces
- `src/components/controller.tsx`: Uses `<Show>` for conditional method bodies and attributes
- `src/components/operations-interface.tsx`: Uses ternary for simple doc assignment

## Key paths

- **Emitter entry**: `src/emitter.tsx` — `$onEmit`; uses `extract-models` and emitter-framework `ClassDeclaration`.
- **Model/type extraction**: `src/utils/extract-types.ts` — single entrypoint for models and enums (skips stdlib and array/record); `extract-models.ts` and `extract-enums.ts` are thin wrappers.
- **Output flattening**: All emitted models and enums are placed in a single C# namespace (`Generated.Models`). TypeSpec namespace hierarchy is not preserved; two types with the same short name in different TypeSpec namespaces would collide (same file/class name). Prefer unique type names across namespaces or document this limitation.
- **Type mapping**: Prefer emitter-framework C# `TypeExpression` and typekits; add `src/utils/type-mapping.ts` only if framework/typekits cannot cover a case.
- **Samples**: `samples/*.tsp` + `samples/main.tsp` — sample specs; compile with `npm run build:samples` → output under `tsp-output/`.

## Commands

- `npm run build` — build the emitter (Alloy).
- `npm run build:samples` — build emitter then compile `samples/main.tsp` into `tsp-output/`.
- `npm run test` / `npm run test:watch` — run Vitest tests (emitter behavior, compile output).

When editing the emitter or adding controllers, run `npm run build:samples` and inspect `tsp-output/http-server-aspnet/` to verify generated C#.
