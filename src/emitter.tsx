import * as cs from "@alloy-js/csharp";
import type { Children } from "@alloy-js/core";
import { Show } from "@alloy-js/core";
import type { EmitContext, Namespace, Program } from "@typespec/compiler";
import type { HttpOperation, OperationContainer } from "@typespec/http";
import {
  Experimental_ComponentOverrides,
  Experimental_ComponentOverridesConfig,
  Output,
  writeOutput,
} from "@typespec/emitter-framework";
import { ClassDeclaration, EnumDeclaration } from "@typespec/emitter-framework/csharp";
import { ControllerDeclaration } from "./components/controller.jsx";
import { IntrinsicTypeExpression } from "./components/intrinsic-type-expression.jsx";
import { OperationsInterfaceDeclaration } from "./components/operations-interface.jsx";
import { UnionTypeExpression } from "./components/union-type-expression.jsx";
import { UnionVariantTypeExpression } from "./components/union-variant-type-expression.jsx";
import { VisibilityClassDeclaration } from "./components/visibility-class-declaration.jsx";
import type { EmitterOptions } from "./lib.js";
import { getHttpServices } from "./utils/extract-http-services.js";
import { extractTypes } from "./utils/extract-types.js";
import { groupOperationsByContainer } from "./utils/operation-to-action.js";
import { resolveVersionPlan } from "./utils/resolve-versions.js";
import type { VisibilityFilteredModel } from "./utils/visibility-analysis.js";
import { analyzeVisibility } from "./utils/visibility-analysis.js";

interface EmitConfig {
  program: Program;
  namePolicy: ReturnType<typeof cs.createCSharpNamePolicy>;
  modelsNamespace: string;
  operationsNamespace: string;
  controllersNamespace: string;
  pathPrefix: string;
  rootNamespace?: Namespace;
}

/**
 * Build the JSX output tree for a single emission scope (one version or the whole program).
 */
function buildOutputTree(config: EmitConfig): Children {
  const {
    program,
    namePolicy,
    modelsNamespace,
    operationsNamespace,
    controllersNamespace,
    pathPrefix,
    rootNamespace,
  } = config;

  const { models, enums } = extractTypes(program, rootNamespace);

  const [httpServices] = getHttpServices(program, rootNamespace);
  const controllerGroups: Array<{
    container: OperationContainer;
    operations: HttpOperation[];
  }> = [];
  const allOperations: HttpOperation[] = [];
  for (const service of httpServices) {
    if (service.operations.length === 0) continue;
    allOperations.push(...service.operations);
    const byContainer = groupOperationsByContainer(service.operations);
    for (const [container, operations] of byContainer) {
      if (operations.length > 0) {
        controllerGroups.push({ container, operations });
      }
    }
  }

  // Analyze visibility to determine which models need filtered DTOs
  const visibilityPlan = analyzeVisibility(program, models, allOperations);

  return (
    <>
      <cs.Namespace name={modelsNamespace}>
        {enums.map((enumType) => (
          <cs.SourceFile
            path={`${pathPrefix}Models/${namePolicy.getName(enumType.name!, "enum")}.cs`}
          >
            <EnumDeclaration type={enumType} />
          </cs.SourceFile>
        ))}
        {visibilityPlan.standardModels.map((model) => (
          <cs.SourceFile path={`${pathPrefix}Models/${model.name}.cs`}>
            <ClassDeclaration type={model} />
          </cs.SourceFile>
        ))}
        {visibilityPlan.filteredModels.map((fm) => (
          <cs.SourceFile path={`${pathPrefix}Models/${fm.className}.cs`}>
            <VisibilityClassDeclaration model={fm} />
          </cs.SourceFile>
        ))}
      </cs.Namespace>
      <Show when={controllerGroups.length > 0}>
        <cs.Namespace name={operationsNamespace}>
          {controllerGroups.map(({ container, operations }) => {
            const interfaceName =
              "I" +
              (container.name
                ? namePolicy.getName(container.name, "class")
                : "Api");
            return (
              <cs.SourceFile
                path={`${pathPrefix}Operations/${interfaceName}.cs`}
                using={[modelsNamespace]}
              >
                <OperationsInterfaceDeclaration
                  program={program}
                  container={container}
                  operations={operations}
                  visibilityLookup={visibilityPlan.lookup}
                />
              </cs.SourceFile>
            );
          })}
        </cs.Namespace>
        <cs.Namespace name={controllersNamespace}>
          {controllerGroups.map(({ container, operations }) => {
            const controllerName =
              (container.name
                ? namePolicy.getName(container.name, "class")
                : "Api") + "Controller";
            return (
              <cs.SourceFile
                path={`${pathPrefix}Controllers/${controllerName}.cs`}
                using={[modelsNamespace, operationsNamespace]}
              >
                <ControllerDeclaration
                  program={program}
                  container={container}
                  operations={operations}
                  visibilityLookup={visibilityPlan.lookup}
                />
              </cs.SourceFile>
            );
          })}
        </cs.Namespace>
      </Show>
    </>
  );
}

export async function $onEmit(context: EmitContext<EmitterOptions>) {
  const options = context.options;
  const baseModelsNs = options?.namespace?.models ?? "Generated.Models";
  const baseOperationsNs =
    options?.namespace?.operations ?? "Generated.Operations";
  const baseControllersNs =
    options?.namespace?.controllers ?? "Generated.Controllers";
  const program = context.program;
  const namePolicy = cs.createCSharpNamePolicy();

  const overrides = new Experimental_ComponentOverridesConfig()
    .forTypeKind("Intrinsic", {
      reference: IntrinsicTypeExpression,
    })
    .forTypeKind("Union", {
      reference: UnionTypeExpression,
    })
    .forTypeKind("UnionVariant", {
      reference: UnionVariantTypeExpression,
    });

  const versionPlan = await resolveVersionPlan(program);

  if (versionPlan.isVersioned) {
    for (const snapshot of versionPlan.snapshots) {
      const vLabel = snapshot.sanitizedLabel;
      const tree = buildOutputTree({
        program,
        namePolicy,
        modelsNamespace: `Generated.${vLabel}.Models`,
        operationsNamespace: `Generated.${vLabel}.Operations`,
        controllersNamespace: `Generated.${vLabel}.Controllers`,
        pathPrefix: `${snapshot.versionLabel}/`,
        rootNamespace: snapshot.namespace,
      });

      await writeOutput(
        program,
        <Experimental_ComponentOverrides overrides={overrides}>
          <Output program={program} namePolicy={namePolicy}>
            {tree}
          </Output>
        </Experimental_ComponentOverrides>,
        context.emitterOutputDir,
      );
    }
  } else {
    const tree = buildOutputTree({
      program,
      namePolicy,
      modelsNamespace: baseModelsNs,
      operationsNamespace: baseOperationsNs,
      controllersNamespace: baseControllersNs,
      pathPrefix: "",
    });

    await writeOutput(
      program,
      <Experimental_ComponentOverrides overrides={overrides}>
        <Output program={program} namePolicy={namePolicy}>
          {tree}
        </Output>
      </Experimental_ComponentOverrides>,
      context.emitterOutputDir,
    );
  }
}
