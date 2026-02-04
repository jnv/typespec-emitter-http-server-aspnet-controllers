import { resolvePath } from "@typespec/compiler";
import { createTestLibrary, TypeSpecTestLibrary } from "@typespec/compiler/testing";
import { fileURLToPath } from "url";

export const HttpServerAspnetTestLibrary: TypeSpecTestLibrary = createTestLibrary({
  name: "http-server-aspnet",
  packageRoot: resolvePath(fileURLToPath(import.meta.url), "../../../../"),
});
