import * as cs from "@alloy-js/csharp";
import type { Model } from "@typespec/compiler";
import { mapTypeSpecTypeToCSharp } from "../utils/type-mapping.js";

export interface CSharpModelProps {
  model: Model;
}

export function CSharpModel({ model }: CSharpModelProps) {
  return (
    <cs.ClassDeclaration public name={model.name}>
      {Array.from(model.properties.values()).map((prop) => (
        <cs.Property
          name={prop.name}
          type={mapTypeSpecTypeToCSharp(prop.type)}
          public
          get
          set
        />
      ))}
    </cs.ClassDeclaration>
  );
}
