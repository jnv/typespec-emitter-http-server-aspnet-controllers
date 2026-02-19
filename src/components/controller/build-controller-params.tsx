import * as cs from "@alloy-js/csharp";
import { Threading } from "@alloy-js/csharp/global/System";
import type { Children } from "@alloy-js/core";
import type { HttpOperation, HttpPayloadBody } from "@typespec/http";
import { TypeExpression } from "@typespec/emitter-framework/csharp";
import { AspNetMvc } from "../../lib/aspnet-mvc.js";
import type { ActionMethodInfo } from "../../utils/operation-to-action.js";
import {
  getBodyType,
  getParamType,
} from "../../utils/operation-to-action.js";
import type { VisibilityFilteredModel } from "../../utils/visibility-analysis.js";
import { getVisibilityContextForVerb } from "../../utils/visibility-analysis.js";

const bindingAttributeMap: Record<string, Children> = {
  FromRoute: (<cs.Attribute name={AspNetMvc.FromRouteAttribute} />) as Children,
  FromQuery: (<cs.Attribute name={AspNetMvc.FromQueryAttribute} />) as Children,
  FromBody: (<cs.Attribute name={AspNetMvc.FromBodyAttribute} />) as Children,
};

/**
 * Build parameter descriptors for a controller action method.
 * Maps TypeSpec parameters to C# method parameters with binding attributes,
 * and appends a trailing CancellationToken parameter.
 */
export function buildControllerParams(
  info: ActionMethodInfo,
  op?: HttpOperation,
  visibilityLookup?: Map<string, VisibilityFilteredModel>,
): Array<{ name: string; type: Children; attributes?: cs.AttributesProp }> {
  return [
    ...info.parameters.map((ap) => {
      let type: Children;

      if (ap.attribute === "FromBody" && "type" in ap.param) {
        const bodyType = getBodyType(ap.param as unknown as HttpPayloadBody);

        // Check for visibility-filtered DTO
        if (
          op &&
          visibilityLookup &&
          bodyType &&
          bodyType.kind === "Model" &&
          bodyType.name
        ) {
          const context = getVisibilityContextForVerb(op.verb);
          const key = `${bodyType.name}:${context}`;
          const filtered = visibilityLookup.get(key);
          if (filtered) {
            type = filtered.refkey as Children;
          } else {
            type = (<TypeExpression type={bodyType!} />) as Children;
          }
        } else {
          type = (<TypeExpression type={bodyType!} />) as Children;
        }
      } else {
        type = (<TypeExpression type={getParamType(ap).type} />) as Children;
      }

      let attribute: Children | undefined;
      if (ap.attribute && ap.attribute in bindingAttributeMap) {
        attribute = bindingAttributeMap[ap.attribute];
      } else if (ap.attribute === "FromHeader") {
        attribute = ap.headerName ? (
          <cs.Attribute name={AspNetMvc.FromHeaderAttribute} args={[ap.headerName]} />
        ) : (
          <cs.Attribute name={AspNetMvc.FromHeaderAttribute} />
        );
      }

      return {
        name: ap.name,
        type,
        attributes: attribute ? ([attribute] as cs.AttributesProp) : undefined,
      };
    }),
    {
      name: "cancellationToken",
      type: Threading.CancellationToken as Children,
      attributes: undefined,
    },
  ];
}
