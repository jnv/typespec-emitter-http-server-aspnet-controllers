import * as cs from "@alloy-js/csharp";
import { Show } from "@alloy-js/core";
import type { EmitContext } from "@typespec/compiler";
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
import type { EmitterOptions } from "./lib.js";
import { getHttpServices } from "./utils/extract-http-services.js";
import { extractTypes } from "./utils/extract-types.js";
import { groupOperationsByContainer } from "./utils/operation-to-action.js";

export async function $onEmit(context: EmitContext<EmitterOptions>) {
  // Read namespace configuration from options, with defaults
  const options = context.options;
  const modelsNamespace = options?.namespace?.models ?? "Generated.Models";
  const operationsNamespace = options?.namespace?.operations ?? "Generated.Operations";
  const controllersNamespace = options?.namespace?.controllers ?? "Generated.Controllers";
  const program = context.program;
  const namePolicy = cs.createCSharpNamePolicy();
  const { models, enums } = extractTypes(program);

  const [httpServices] = getHttpServices(program);
  const controllerGroups: Array<{ container: OperationContainer; operations: HttpOperation[] }> = [];
  for (const service of httpServices) {
    if (service.operations.length === 0) continue;
    const byContainer = groupOperationsByContainer(service.operations);
    for (const [container, operations] of byContainer) {
      if (operations.length > 0) {
        controllerGroups.push({ container, operations });
      }
    }
  }

  const overrides = new Experimental_ComponentOverridesConfig()
    .forTypeKind("Intrinsic", {
      reference: IntrinsicTypeExpression,
    });

  await writeOutput(
    program,
    <Experimental_ComponentOverrides overrides={overrides}>
      <Output program={program} namePolicy={namePolicy}>
        <cs.Namespace name={modelsNamespace}>
        {enums.map((enumType) => (
          <cs.SourceFile path={`Models/${namePolicy.getName(enumType.name!, "enum")}.cs`}>
            <EnumDeclaration type={enumType} />
          </cs.SourceFile>
        ))}
        {models.map((model) => (
          <cs.SourceFile path={`Models/${model.name}.cs`}>
            <ClassDeclaration type={model} />
          </cs.SourceFile>
        ))}
      </cs.Namespace>
      <Show when={controllerGroups.length > 0}>
        <cs.Namespace name={operationsNamespace}>
          {controllerGroups.map(({ container, operations }) => {
            const interfaceName =
              "I" + (container.name ? namePolicy.getName(container.name, "class") : "Api");
            return (
              <cs.SourceFile
                path={`Operations/${interfaceName}.cs`}
                using={[modelsNamespace]}
              >
                <OperationsInterfaceDeclaration
                  program={program}
                  container={container}
                  operations={operations}
                />
              </cs.SourceFile>
            );
          })}
        </cs.Namespace>
        <cs.Namespace name={controllersNamespace}>
          {controllerGroups.map(({ container, operations }) => {
            const controllerName =
              (container.name ? namePolicy.getName(container.name, "class") : "Api") + "Controller";
            return (
              <cs.SourceFile
                path={`Controllers/${controllerName}.cs`}
                using={[modelsNamespace, operationsNamespace]}
              >
                <ControllerDeclaration
                  program={program}
                  container={container}
                  operations={operations}
                />
              </cs.SourceFile>
            );
          })}
        </cs.Namespace>
      </Show>
      </Output>
    </Experimental_ComponentOverrides>,
    context.emitterOutputDir,
  );
}
