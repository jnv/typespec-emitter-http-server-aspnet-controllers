import * as cs from "@alloy-js/csharp";
import type { Children } from "@alloy-js/core";
import { For } from "@alloy-js/core";
import { TypeExpression } from "@typespec/emitter-framework/csharp";
import type { VisibilityFilteredModel } from "../utils/visibility-analysis.js";

export interface VisibilityClassDeclarationProps {
  model: VisibilityFilteredModel;
  namePolicy?: ReturnType<typeof cs.createCSharpNamePolicy>;
}

/**
 * Renders a C# class with only the properties visible in a specific
 * lifecycle context. Used for input DTOs like UserCreateInput, UserUpdateInput.
 */
export function VisibilityClassDeclaration(
  props: VisibilityClassDeclarationProps,
): Children {
  const { model } = props;
  const namePolicy = props.namePolicy ?? cs.useCSharpNamePolicy();

  return (
    <cs.ClassDeclaration
      public
      name={model.className}
      refkey={model.refkey}
    >
      <For each={model.properties} hardline>
        {(prop) => {
          const propName = namePolicy.getName(prop.name, "class-property");
          const typeExpr = model.allOptional ? (
            <><TypeExpression type={prop.type} />?</>
          ) : (
            <TypeExpression type={prop.type} />
          );

          return (
            <cs.Property
              public
              name={propName}
              type={typeExpr as Children}
              get
              set
            />
          );
        }}
      </For>
    </cs.ClassDeclaration>
  );
}
