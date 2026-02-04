import { Output } from "@alloy-js/core";
import * as cs from "@alloy-js/csharp";
import type { EmitContext } from "@typespec/compiler";
import { writeOutput } from "@typespec/emitter-framework";
import { CSharpModel } from "./components/CSharpModel.js";
import { extractModels } from "./utils/extract-models.js";
export async function $onEmit(context: EmitContext) {
  const namespace = "Generated.Models";
  const globalNs = context.program.getGlobalNamespaceType();
  const models = extractModels(globalNs);

  await writeOutput(
    context.program,
    <Output namePolicy={cs.createCSharpNamePolicy()}>
      <cs.Namespace name={namespace}>
        <cs.SourceFile path="Models.cs">
          {models.map((model) => (
            <CSharpModel model={model} />
          ))}
        </cs.SourceFile>
      </cs.Namespace>
    </Output>,
    context.emitterOutputDir,
  );
}
