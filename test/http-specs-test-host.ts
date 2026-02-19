import { resolvePath } from "@typespec/compiler";
import { createTester } from "@typespec/compiler/testing";

// Tester with all libraries needed by @typespec/http-specs scenarios
const baseTester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@typespec/xml",
    "@typespec/spector",
    "http-server-aspnet",
  ],
});

// Emitter tester for compiling http-specs scenarios through our emitter
export const HttpSpecsTester = baseTester.emit("http-server-aspnet");
