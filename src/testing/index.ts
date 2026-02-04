import { resolvePath } from "@typespec/compiler";
import { createTestLibrary, TypeSpecTestLibrary } from "@typespec/compiler/testing";
import { fileURLToPath } from "node:url";

export const HttpServerAspnetTestLibrary: TypeSpecTestLibrary = createTestLibrary({
  name: "http-server-aspnet",
  packageRoot: resolvePath(fileURLToPath(import.meta.url), "../.."),
});
