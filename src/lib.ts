import { createTypeSpecLibrary } from "@typespec/compiler";

export const $lib = createTypeSpecLibrary({
  name: "http-server-aspnet",
  diagnostics: {},
  emitter: {
    options: {
      type: "object",
      additionalProperties: false,
      properties: {
        namespace: {
          type: "object",
          additionalProperties: false,
          properties: {
            models: {
              type: "string",
              nullable: true,
              description: "Namespace for generated model classes. Defaults to 'Generated.Models'",
            },
            operations: {
              type: "string",
              nullable: true,
              description: "Namespace for generated operation interfaces. Defaults to 'Generated.Operations'",
            },
            controllers: {
              type: "string",
              nullable: true,
              description: "Namespace for generated controllers. Defaults to 'Generated.Controllers'",
            },
          },
          nullable: true,
        },
      },
    } as any,
  },
});

export const { reportDiagnostic, createDiagnostic } = $lib;

// Type definition for emitter options
export interface EmitterOptions {
  namespace?: {
    models?: string;
    operations?: string;
    controllers?: string;
  };
}
