import * as cs from "@alloy-js/csharp";
import type { EmitContext } from "@typespec/compiler";
import { Output, writeOutput } from "@typespec/emitter-framework";
import { ClassDeclaration } from "@typespec/emitter-framework/csharp";
import { extractModels } from "./utils/extract-models.js";

export async function $onEmit(context: EmitContext) {
  const namespace = "Generated.Models";
  const globalNs = context.program.getGlobalNamespaceType();
  const models = extractModels(globalNs);

  await writeOutput(
    context.program,
    <Output program={context.program} namePolicy={cs.createCSharpNamePolicy()}>
      <cs.Namespace name={namespace}>
        <cs.SourceFile path="Models.cs">
          {models.map((model) => (
            <ClassDeclaration type={model} />
          ))}
        </cs.SourceFile>
      </cs.Namespace>
    </Output>,
    context.emitterOutputDir,
  );
}
