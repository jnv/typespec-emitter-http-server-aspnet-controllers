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
| **C# / JSX output** | [@alloy-js/core](https://www.npmjs.com/package/@alloy-js/core), [@alloy-js/csharp](https://www.npmjs.com/package/@alloy-js/csharp) | Declarative C# code generation (JSX-style API, namespaces, source files, C# name policy). |
| **Library / build** | [@alloy-js/cli](https://www.npmjs.com/package/@alloy-js/cli), [@alloy-js/rollup-plugin](https://www.npmjs.com/package/@alloy-js/rollup-plugin) | Build and bundle the emitter (`alloy build`, Rollup + Babel for TS/JSX). |
| **Runtime / tests** | Node (ESM), [Vitest](https://vitest.dev/) | Run emitter as a TypeSpec library; tests use `@typespec/compiler/testing` and the local emitter. |
| **Output** | C# (ASP.NET Core) | Generated code targets .NET (e.g. ASP.NET Core) — models today; controllers later. |

## Preferences for agents

When extending or modifying the emitter, follow this order of preference:

- **Emitter-framework first**  
  Prefer components from `@typespec/emitter-framework` and `@typespec/emitter-framework/csharp` before writing custom emission logic. The C# subpackage is not fully documented but is part of the framework; use it when it fits. From `@typespec/emitter-framework/csharp`: `ClassDeclaration`, `TypeExpression`, `Property`, `EnumDeclaration`, `JsonConverter`, `JsonConverterResolver`.
- **Typekits before custom reflection**  
  For TypeSpec type/model/operation reflection, use typekits (`$` from `@typespec/compiler/typekit` or `useTsp()` from `@typespec/emitter-framework`) before writing custom traversal or type checks. If using HTTP metadata, add `import "@typespec/http/experimental/typekit"` so HTTP typekits are available.
- **Alloy C# before strings**  
  For C# structure (classes, methods, properties, attributes, namespaces, files), prefer `@alloy-js/csharp` components (e.g. `cs.ClassDeclaration`, `cs.Method`, `cs.Property`, `cs.Attribute`, `cs.Namespace`, `cs.SourceFile`) over building C# with template literals or string concatenation.

References: [Emitter framework](https://typespec.io/docs/extending-typespec/emitter-framework/), [Typekits API](https://typespec.io/docs/standard-library/reference/typekits/); [TypeSpec overview](https://deepwiki.com/microsoft/typespec/), [Emitter framework](https://deepwiki.com/microsoft/typespec/4-emitter-framework), [TCGC / SDK context](https://deepwiki.com/microsoft/typespec/4.3-tcgc-and-sdk-context).

## Key paths

- **Emitter entry**: `src/emitter.tsx` — `$onEmit`; uses `extract-models` and emitter-framework `ClassDeclaration`.
- **Model filtering**: `src/utils/extract-models.ts` — which models to emit (skips stdlib and indexer-only types).
- **Type mapping**: Prefer emitter-framework C# `TypeExpression` and typekits; add `src/utils/type-mapping.ts` only if framework/typekits cannot cover a case.
- **Samples**: `samples/*.tsp` + `samples/main.tsp` — sample specs; compile with `npm run build:samples` → output under `tsp-output/`.

## Commands

- `npm run build` — build the emitter (Alloy).
- `npm run build:samples` — build emitter then compile `samples/main.tsp` into `tsp-output/`.
- `npm run test` / `npm run test:watch` — run Vitest tests (emitter behavior, compile output).

When editing the emitter or adding controllers, run `npm run build:samples` and inspect `tsp-output/http-server-aspnet/` to verify generated C#.
