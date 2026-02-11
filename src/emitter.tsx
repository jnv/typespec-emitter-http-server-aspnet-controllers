import * as cs from "@alloy-js/csharp";
import type { EmitContext } from "@typespec/compiler";
import { Output, writeOutput } from "@typespec/emitter-framework";
import { ClassDeclaration, EnumDeclaration } from "@typespec/emitter-framework/csharp";
import { ControllerDeclaration } from "./components/controller.jsx";
import { getHttpServices } from "./utils/extract-http-services.js";
import { extractEnums } from "./utils/extract-enums.js";
import { extractModels } from "./utils/extract-models.js";
import { groupOperationsByContainer } from "./utils/operation-to-action.js";

export async function $onEmit(context: EmitContext) {
  const program = context.program;
  const namePolicy = cs.createCSharpNamePolicy();
  const modelsNamespace = "Generated.Models";
  const controllersNamespace = "Generated.Controllers";
  const globalNs = program.getGlobalNamespaceType();
  const enums = extractEnums(globalNs);
  const models = extractModels(globalNs);

  const [httpServices] = getHttpServices(program);
  const controllerGroups: Array<{ container: import("@typespec/http").OperationContainer; operations: import("@typespec/http").HttpOperation[] }> = [];
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
          <cs.SourceFile path={`${namePolicy.getName(enumType.name!, "enum")}.cs`}>
            <EnumDeclaration type={enumType} />
          </cs.SourceFile>
        ))}
        {models.map((model) => (
          <cs.SourceFile path={`${model.name}.cs`}>
            <ClassDeclaration type={model} />
          </cs.SourceFile>
        ))}
      </cs.Namespace>
      {controllerGroups.length > 0 && (
        <cs.Namespace name={controllersNamespace}>
          {controllerGroups.map(({ container, operations }) => {
            const controllerName =
              (container.name ? namePolicy.getName(container.name, "class") : "Api") + "Controller";
            return (
              <cs.SourceFile
                path={`${controllerName}.cs`}
                using={["Microsoft.AspNetCore.Mvc", "Generated.Models"]}
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
