import { t, expectDiagnostics } from "@typespec/compiler/testing";
import { strictEqual } from "node:assert";
import { describe, it } from "vitest";
import { Tester } from "./test-host.js";


describe("hello", () => {
  it("emit output.txt with content hello world", async () => {
    const results = await Tester.emit(`op test(): void;`);
    strictEqual(results["output.txt"], "Hello world\n");
  });
});


// Check everything works fine
it("does this", async () => {
  const { Foo } = await Tester.compile(t.code`
    model ${t.model("Foo")} {}
  `);
  strictEqual(Foo.name, "Foo");
});

// Check diagnostics are emitted
it("errors", async () => {
  const diagnostics = await Tester.diagnose(`
      model Bar {}
  `);
  expectDiagnostics(diagnostics, { code: "...", message: "..." });
});