import { createTypeSpecLibrary } from "@typespec/compiler";

export const $lib = createTypeSpecLibrary({
  name: "http-server-aspnet",
  diagnostics: {},
});

export const { reportDiagnostic, createDiagnostic } = $lib;
