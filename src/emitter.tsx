import * as cs from "@alloy-js/csharp";
import type { EmitContext } from "@typespec/compiler";
import type { HttpOperation, OperationContainer } from "@typespec/http";
import { Output, writeOutput } from "@typespec/emitter-framework";
import { ClassDeclaration, EnumDeclaration } from "@typespec/emitter-framework/csharp";
import { ControllerDeclaration } from "./components/controller.jsx";
import { OperationsInterfaceDeclaration } from "./components/operations-interface.jsx";
import { getHttpServices } from "./utils/extract-http-services.js";
import { extractTypes } from "./utils/extract-types.js";
import { groupOperationsByContainer } from "./utils/operation-to-action.js";

const modelsNamespace = "Generated.Models";
const operationsNamespace = "Generated.Operations";
const controllersNamespace = "Generated.Controllers";

export async function $onEmit(context: EmitContext) {
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

  await writeOutput(
    program,
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
      {controllerGroups.length > 0 && (
        <cs.Namespace name={operationsNamespace}>
          {controllerGroups.map(({ container, operations }) => {
            const interfaceName =
              "I" + (container.name ? namePolicy.getName(container.name, "class") : "Api");
            return (
              <cs.SourceFile
                path={`Operations/${interfaceName}.cs`}
                using={["Generated.Models", "System.Threading", "System.Threading.Tasks"]}
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
      )}
      {controllerGroups.length > 0 && (
        <cs.Namespace name={controllersNamespace}>
          {controllerGroups.map(({ container, operations }) => {
            const controllerName =
              (container.name ? namePolicy.getName(container.name, "class") : "Api") + "Controller";
            return (
              <cs.SourceFile
                path={`Controllers/${controllerName}.cs`}
                using={[
                  "Microsoft.AspNetCore.Mvc",
                  "Generated.Models",
                  "Generated.Operations",
                  "System.Threading",
                  "System.Threading.Tasks",
                ]}
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
      )}
    </Output>,
    context.emitterOutputDir,
  );
}
