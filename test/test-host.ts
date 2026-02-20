import { resolvePath } from "@typespec/compiler";
import { createTester } from "@typespec/compiler/testing";

// Include the local package so the emitter "http-server-aspnet" can be resolved
const baseTester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: ["@typespec/http", "@typespec/versioning", "http-server-aspnet"],
});

// Emitter tester for testing C# output
export const Tester = baseTester.emit("http-server-aspnet");

// Base tester for compile/diagnose without emitter (e.g. to get marked entities)
export const CompileTester = baseTester;