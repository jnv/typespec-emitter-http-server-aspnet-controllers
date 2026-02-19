import type { Model, ModelProperty, Program } from "@typespec/compiler";
import type { HttpOperation, HttpVerb } from "@typespec/http";
import { createMetadataInfo, Visibility } from "@typespec/http";
import type { MetadataInfo } from "@typespec/http";
import type { Refkey } from "@alloy-js/core";
import { refkey } from "@alloy-js/core";

export type VisibilityContext = "Create" | "Read" | "Update";

export interface VisibilityFilteredModel {
  /** The original TypeSpec model */
  originalModel: Model;
  /** The visibility context */
  context: VisibilityContext;
  /** The filtered properties (only those visible in this context) */
  properties: ModelProperty[];
  /** Whether all properties should be rendered as optional (true for Update/PATCH) */
  allOptional: boolean;
  /** Suggested C# class name (e.g., "UserCreateInput") */
  className: string;
  /** Refkey for cross-referencing this DTO in the output tree */
  refkey: Refkey;
}

export interface VisibilityPlan {
  /** Models that need no special treatment (emit as-is via ClassDeclaration) */
  standardModels: Model[];
  /** Models that need visibility-filtered DTOs */
  filteredModels: VisibilityFilteredModel[];
  /** Map from "ModelName:Context" -> filtered model info */
  lookup: Map<string, VisibilityFilteredModel>;
}

const contextToVisibility: Record<VisibilityContext, Visibility> = {
  Create: Visibility.Create,
  Read: Visibility.Read,
  Update: Visibility.Update,
};

const contextToSuffix: Record<VisibilityContext, string> = {
  Create: "CreateInput",
  Read: "",
  Update: "UpdateInput",
};

/** Map HTTP verb to the visibility context for request body. */
export function getVisibilityContextForVerb(
  verb: HttpVerb,
): VisibilityContext {
  switch (verb) {
    case "post":
      return "Create";
    case "put":
    case "patch":
      return "Update";
    default:
      return "Read";
  }
}

/**
 * Get properties of a model that are visible in the given visibility context
 * and are payload properties (not metadata like @header, @path, @query).
 */
function getVisiblePayloadProperties(
  metadataInfo: MetadataInfo,
  model: Model,
  visibility: Visibility,
): ModelProperty[] {
  const visible: ModelProperty[] = [];
  for (const prop of model.properties.values()) {
    if (metadataInfo.isPayloadProperty(prop, visibility)) {
      visible.push(prop);
    }
  }
  return visible;
}

/** Check if a model has any properties with explicit visibility decorators. */
function hasVisibilityDecorators(model: Model): boolean {
  for (const prop of model.properties.values()) {
    for (const dec of prop.decorators) {
      if (
        dec.decorator.name === "$visibility" ||
        dec.decorator.name === "$invisible"
      ) {
        return true;
      }
    }
  }
  return false;
}

/** Check if two property lists have the same set of property names. */
function propertySetsEqual(
  a: ModelProperty[],
  b: ModelProperty[],
): boolean {
  if (a.length !== b.length) return false;
  const namesA = new Set(a.map((p) => p.name));
  for (const prop of b) {
    if (!namesA.has(prop.name)) return false;
  }
  return true;
}

/**
 * Find the body model type from an HTTP operation's body parameter.
 * Returns the Model if the body type is a named model, undefined otherwise.
 */
function getBodyModel(operation: HttpOperation): Model | undefined {
  const body = operation.parameters.body;
  if (!body) return undefined;
  const type = body.type;
  if (type.kind === "Model" && type.name) return type;
  return undefined;
}

/**
 * Analyze visibility requirements for models used in HTTP operations.
 * Produces a plan that identifies which models need filtered DTOs
 * and which can be emitted as-is.
 */
export function analyzeVisibility(
  program: Program,
  models: Model[],
  httpOperations: HttpOperation[],
): VisibilityPlan {
  const metadataInfo = createMetadataInfo(program);

  // Track which (model, context) pairs are actually needed
  const neededContexts = new Map<Model, Set<VisibilityContext>>();

  for (const op of httpOperations) {
    const bodyModel = getBodyModel(op);
    if (bodyModel) {
      const context = getVisibilityContextForVerb(op.verb);
      if (context !== "Read") {
        let contexts = neededContexts.get(bodyModel);
        if (!contexts) {
          contexts = new Set();
          neededContexts.set(bodyModel, contexts);
        }
        contexts.add(context);
      }
    }
  }

  const standardModels: Model[] = [];
  const filteredModels: VisibilityFilteredModel[] = [];
  const lookup = new Map<string, VisibilityFilteredModel>();

  for (const model of models) {
    const contexts = neededContexts.get(model);

    // Skip models not used as input bodies or that have no visibility decorators
    if (!contexts || !hasVisibilityDecorators(model)) {
      standardModels.push(model);
      continue;
    }

    // Get the Read (default) property set for comparison
    const readProps = getVisiblePayloadProperties(
      metadataInfo,
      model,
      Visibility.Read,
    );

    let needsFiltering = false;

    for (const context of contexts) {
      const visibility = contextToVisibility[context];
      const filteredProps = getVisiblePayloadProperties(
        metadataInfo,
        model,
        visibility,
      );

      // Only create a filtered DTO if the property set actually differs
      if (!propertySetsEqual(filteredProps, readProps)) {
        needsFiltering = true;
        const suffix = contextToSuffix[context];
        const className = model.name + suffix;
        const rk = refkey({
          name: className,
          context,
          model,
        });

        const filtered: VisibilityFilteredModel = {
          originalModel: model,
          context,
          properties: filteredProps,
          allOptional: context === "Update",
          className,
          refkey: rk,
        };
        filteredModels.push(filtered);
        lookup.set(`${model.name}:${context}`, filtered);
      }
    }

    // The model itself is always emitted as the Read DTO
    standardModels.push(model);

    // If no actual filtering was needed (all contexts produce same props),
    // the model just goes through as a standard model (already pushed above)
    if (!needsFiltering) {
      // Remove from lookup if we mistakenly added entries
      for (const context of contexts) {
        lookup.delete(`${model.name}:${context}`);
      }
    }
  }

  return { standardModels, filteredModels, lookup };
}
