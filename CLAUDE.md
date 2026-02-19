# Agent instructions

## Purpose

This project is a **TypeSpec code emitter** for ASP.NET Core servers. It consumes TypeSpec (`.tsp`) API definitions and emits:

- **C# models** (POCOs)
- **Controllers** (API endpoints)

## Stack

| Layer                 | Technology                                                                                                                                     | Role                                                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Spec / compiler**   | [TypeSpec](https://typespec.io/) (`@typespec/compiler`, `@typespec/http`)                                                                      | Defines the API (models, operations); compiler provides the program AST and emit hooks.                                                                |
| **Emitter framework** | [@typespec/emitter-framework](https://github.com/microsoft/typespec/tree/main/packages/emitter-framework)                                      | Base for emitters: `Output`, `writeOutput`, C# helpers like `ClassDeclaration`, name policies, output layout.                                          |
| **C# / JSX output**   | [@alloy-js/core](https://www.npmjs.com/package/@alloy-js/core), [@alloy-js/csharp](https://www.npmjs.com/package/@alloy-js/csharp)             | Declarative C# code generation (JSX-style API): type declarations, members, attributes, project structure — `Namespace`, `SourceFile`, C# name policy. |
| **Library / build**   | [@alloy-js/cli](https://www.npmjs.com/package/@alloy-js/cli), [@alloy-js/rollup-plugin](https://www.npmjs.com/package/@alloy-js/rollup-plugin) | Build and bundle the emitter (`alloy build`, Rollup + Babel for TS/JSX).                                                                               |
| **Runtime / tests**   | Node (ESM), [Vitest](https://vitest.dev/)                                                                                                      | Run emitter as a TypeSpec library; tests use `@typespec/compiler/testing` and the local emitter.                                                       |
| **Output**            | C# (ASP.NET Core)                                                                                                                              | Generated code targets .NET (e.g. ASP.NET Core) — models (POCOs), operations interfaces, and controllers.                                                                     |

## Code style

- **No inline type imports**
  Do not use inline type imports (e.g. `import("@typespec/compiler").Type`). Use top-level `import type { Type } from "..."` at the top of the file and refer to the type by name.
- **Separate type and value imports**
  Use separate statements for type-only and value imports. Prefer `import type { X } from "..."` for types and `import { a, b } from "..."` for values; do not mix `type X` and value bindings in the same `import` (e.g. avoid `import { type Children, List }`).
- **File naming conventions**
  All files must use **kebab-case** naming, including TypeScript (`.ts`), JSX (`.tsx`), and all other file types. Examples: `extract-models.ts`, `operations-interface.tsx`, `operation-to-action.ts`, `test-host.ts`. This applies to both source files and test files.
- **Test naming conventions**
  Test names should be verb-first imperative phrases that describe what the test verifies. Use `it emits`, `it creates`, `it includes`, `it verifies`, etc.; avoid `it should`. Examples: `it emits controller with response headers`, `it does not emit Response.Headers when no headers exist`, `it includes the full model type in the operations interface`
- **Test assertions**
  Prefer appropriate assertion methods from `node:assert/strict` over generic `strictEqual`. Use `match()` for regex patterns, `doesNotMatch()` for negative patterns, `ok()` for boolean checks, and `strictEqual()` for exact value comparisons. Example: `match(controller, /Response\.Headers/, "message")` instead of `strictEqual(controller.includes("Response.Headers"), true, "message")`.

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
- **Statements & expressions**: `IfStatement` (with `ElseIfClause`, `ElseClause`), `VarDeclaration` (renders `var name = value;`), `InvocationExpression` (renders `target(args)` — no semicolon), `AccessExpression` / `AccessExpression.Part` (member access, indexer, nullable chains). Also `access()` fluent builder from `@alloy-js/csharp` for chaining `.member()`, `.index()`, `.call()`.
- **Attributes**: `Attribute`, `Attributes`.
- **Naming**: `createCSharpNamePolicy()` / `useCSharpNamePolicy()`; pass element type to `getName()`. Common element types: `"class"`, `"enum"`, `"enum-member"`, `"interface"`, `"class-method"`, `"class-property"`, `"parameter"`, `"namespace"`. Note: use `"class-property"` (not `"property"`) for C# property PascalCase naming; unrecognized element types fall through to camelCase.
- **Builtins (BCL types)**: Import pre-defined .NET types from `@alloy-js/csharp/global/System` (e.g. `import { Threading } from "@alloy-js/csharp/global/System"`). Use `Threading.CancellationToken`, `Tasks.Task` etc. as `Children` values or `refkey` props. Alloy auto-generates `using` directives — no need to add them manually to `SourceFile`. For types not in builtins (e.g. ASP.NET Core), define custom libraries with `createLibrary()` from `@alloy-js/csharp` (see `src/lib/aspnet-mvc.ts`). Attribute types should use the `Attribute` suffix (e.g. `ApiControllerAttribute`); Alloy auto-strips it in `[brackets]`.
- **Documentation** (when needed): `DocComment`, `FromMarkdown`, `Region`.

### Declarative patterns with Alloy Core

When building JSX-based emitters, prefer declarative patterns from `@alloy-js/core` over imperative JavaScript:

- **Conditional rendering**: Use `<Show when={condition}>` instead of `{condition && ...}` or ternaries for JSX rendering.

  ```tsx
  // from src/emitter.tsx — conditionally render namespaces only when operations exist:
  <Show when={controllerGroups.length > 0}>
    <cs.Namespace name={operationsNamespace}>
      {/* ... */}
    </cs.Namespace>
    <cs.Namespace name={controllersNamespace}>
      {/* ... */}
    </cs.Namespace>
  </Show>

  // from src/components/controller/action-method-body.tsx — two-branch rendering with fallback:
  <Show when={hasReturn} fallback={
    <StatementList>
      <>await {serviceCall}</>
      {code`return NoContent()`}
    </StatementList>
  }>
    <List hardline>
      <cs.VarDeclaration name="result">await {serviceCall}</cs.VarDeclaration>
      {code`return Ok(result);`}
    </List>
  </Show>

  // from src/components/controller/action-method-body.tsx — conditional with IfStatement fallback:
  <Show when={h.isOptional} fallback={<>{headerAssign};</>}>
    <cs.IfStatement condition={<>{resultProp} is not null</>}>
      {headerAssign};
    </cs.IfStatement>
  </Show>
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
  // from src/components/operations-interface.tsx:
  const operationDoc = $.type.getDoc(op.operation);
  const doc = operationDoc ? (
    <cs.DocSummary>
      <cs.DocFromMarkdown markdown={operationDoc} />
    </cs.DocSummary>
  ) : undefined;
  ```

- **Statement formatting**: Use `<StatementList>` from `@alloy-js/core` to join multiple statements with semicolons and hardlines. Use `<For each={items} hardline>` for declarative iteration with proper line separation.

  ```tsx
  // from src/components/controller/controller-declaration.tsx — iterate operations:
  <For each={operations} doubleHardline>
    {(op) => {
      const info = getActionMethodInfo(program, op, containerRoute, namePolicy);
      return <cs.Method /* ... */ />;
    }}
  </For>
  ```

- **Symbolic references with `refkey`**: Use `refkey(object)` from `@alloy-js/core` to create stable references between declarations. Assign a `refkey` prop on declarations and use the same `refkey()` elsewhere as a `Children` value to produce a resolved name reference. Alloy handles name resolution automatically.

  ```tsx
  // from src/components/operations-interface.tsx — declare with refkey:
  <cs.InterfaceDeclaration public name={interfaceName} refkey={refkey(container)}>
    {/* ... */}
  </cs.InterfaceDeclaration>

  // from src/components/controller/controller-declaration.tsx — reference the same container:
  <cs.Field private readonly name={operationsFieldName}
    type={refkey(container) as Children} />
  ```

## Key paths

- **Emitter entry**: `src/emitter.tsx` — `$onEmit`; extracts types and HTTP services, then renders models, operations interfaces, and controllers via JSX components. Wraps the output tree in `Experimental_ComponentOverrides` to register custom type-kind overrides (e.g. `IntrinsicTypeExpression` for Intrinsic types) that intercept all `TypeExpression` calls globally, including those inside emitter-framework's `ClassDeclaration`/`Property`.
- **Intrinsic type override**: `src/components/intrinsic-type-expression.tsx` — override component registered via `Experimental_ComponentOverrides` for the `"Intrinsic"` type kind. Maps `unknown` → `object`, `never` → `object`, `null` → `null`. The framework's `TypeExpression` has no branch for `kind === "Intrinsic"` (except `void` via `isVoidType()`); the override mechanism (`Experimental_OverridableComponent`) is the intended extension point.
- **Model/type extraction**: `src/utils/extract-types.ts` — single entrypoint for models and enums (skips stdlib, array/record, and models with Tuple-typed properties — the latter are auth decorator arguments such as OAuth2 flow definitions that cannot be rendered to C#); `extract-models.ts` and `extract-enums.ts` are thin wrappers.
- **HTTP service extraction**: `src/utils/extract-http-services.ts` — collects HTTP operations from all namespaces into a unified service; `src/utils/operation-to-action.ts` — converts HTTP operations to controller action descriptors (parameters, routes, response headers) and groups operations by container.
- **Controller components**: `src/components/controller/controller-declaration.tsx` — renders the ASP.NET controller class (attributes, DI constructor, action methods); `src/components/controller/action-method-body.tsx` — renders the method body (service call, response headers, return); `src/components/controller/build-controller-params.tsx` — maps parameters to binding attributes (`FromRoute`, `FromQuery`, `FromBody`, `FromHeader`).
- **Operations interface**: `src/components/operations-interface.tsx` — renders the operations interface (e.g. `IUsers`) with async methods and `CancellationToken`.
- **ASP.NET library**: `src/lib/aspnet-mvc.ts` — defines ASP.NET Core MVC symbols (`ControllerBase`, `IActionResult`, route/binding/verb attributes) via `createLibrary()`.
- **Output flattening**: All emitted models and enums are placed in a single C# namespace (`Generated.Models`). TypeSpec namespace hierarchy is not preserved; two types with the same short name in different TypeSpec namespaces would collide (same file/class name). Prefer unique type names across namespaces or document this limitation.
- **Type mapping**: Prefer emitter-framework C# `TypeExpression` and typekits over custom type-mapping utilities.
- **Samples**: `samples/*.tsp` + `samples/main.tsp` — sample specs; compile with `npm run build:samples` → output under `tsp-output/`.
- **HTTP specs tests**: `test/http-specs.test.ts` — compiles each `@typespec/http-specs` scenario through the emitter; `test/http-specs-test-host.ts` — tester with all libraries needed by http-specs (`@typespec/rest`, `@typespec/versioning`, `@typespec/xml`, `@typespec/spector`); `test/http-specs-utils.ts` — discovers spec `.tsp` files from the installed `@typespec/http-specs` package. Tests are dynamically generated from the installed specs. `EXPECTED_FAILURES` tracks specs that crash (unsupported types); `SKIP_SPECS` tracks specs with compiler-level issues. When adding support for a new type kind, remove the spec from `EXPECTED_FAILURES` so the test asserts output is produced.

## Commands

- `npm run build` — build the emitter (Alloy). Must run before tests (tests resolve the emitter from `dist/`).
- `npm run build:samples` — build emitter then compile `samples/main.tsp` into `tsp-output/`.
- `npm run test` / `npm run test:watch` — run Vitest tests (emitter behavior, compile output, http-specs).

When editing the emitter or adding controllers, run `npm run build:samples` and inspect `tsp-output/http-server-aspnet/` to verify generated C#.

## HTTP specs coverage

The `test/http-specs.test.ts` suite compiles ~60 standard HTTP scenario specs from `@typespec/http-specs` through the emitter. Current baseline:

- **49 passing** — compile and produce C# output
- **10 expected failures** — emitter crashes on unsupported TypeSpec type kinds in emitter-framework's `TypeExpression`
- **2 skipped** — compiler-level diagnostics unrelated to the emitter

### Failure categories

All 10 expected failures stem from `TypeExpression` (from `@typespec/emitter-framework/csharp`) not handling certain TypeSpec type kinds. Intrinsic types (`unknown`, `never`, `null`) are handled via a `forTypeKind("Intrinsic")` override registered in `src/emitter.tsx` (see `src/components/intrinsic-type-expression.tsx`).

| Type kind | Specs affected | Root cause | Example |
|-----------|---------------|------------|---------|
| **Union** | 9 specs (authentication/api-key, authentication/http/custom, authentication/oauth2, payload/xml, response/status-code-range, type/union, type/property/optionality, type/property/value-types, special-headers/repeatability) | Union return types (`NoContentResponse \| ErrorModel`) and union property types (`"a" \| "b"`) | `op get(): Success \| Error` |
| **UnionVariant** | 1 spec (type/model/inheritance/enum-discriminator) | Specific enum variant as discriminator property type | `kind: DogKind.Golden` |
