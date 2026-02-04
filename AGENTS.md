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

## Key paths

- **Emitter entry**: `src/emitter.tsx` — `$onEmit`; uses `extract-models` and emitter-framework `ClassDeclaration`.
- **Model filtering**: `src/utils/extract-models.ts` — which models to emit (skips stdlib and indexer-only types).
- **Type mapping**: `src/utils/type-mapping.ts` — TypeSpec type → C# type name (if used by custom components).
- **Samples**: `samples/*.tsp` + `samples/main.tsp` — sample specs; compile with `npm run build:samples` → output under `tsp-output/`.

## Commands

- `npm run build` — build the emitter (Alloy).
- `npm run build:samples` — build emitter then compile `samples/main.tsp` into `tsp-output/`.
- `npm run test` / `npm run test:watch` — run Vitest tests (emitter behavior, compile output).

When editing the emitter or adding controllers, run `npm run build:samples` and inspect `tsp-output/http-server-aspnet/` to verify generated C#.
