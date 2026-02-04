import { t } from "@typespec/compiler/testing";
import { strictEqual } from "node:assert";
import { describe, it } from "vitest";
import { CompileTester, Tester } from "./test-host.js";


describe("emitter", () => {
  it("emits C# class for TypeSpec model", async () => {
    const result = await Tester.compile(`
      model User {
        id: int32;
        name: string;
      }
    `);
    const modelsCs = result.outputs["Models.cs"];
    strictEqual(typeof modelsCs, "string", "Models.cs should be emitted");
    strictEqual(
      modelsCs.includes("public class User"),
      true,
      "Models.cs should contain public class User",
    );
    strictEqual(
      modelsCs.includes("public int Id"),
      true,
      "Models.cs should contain public int Id",
    );
    strictEqual(
      modelsCs.includes("public string Name"),
      true,
      "Models.cs should contain public string Name",
    );
  });
});


// Check compile works and returns marked entities
it("compile returns marked entities", async () => {
  const { Foo } = await CompileTester.compile(t.code`
    model ${t.model("Foo")} {}
  `);
  strictEqual(Foo.name, "Foo");
});

// Check diagnose runs
it("diagnose runs", async () => {
  const diagnostics = await CompileTester.diagnose(`
      model Bar {}
  `);
  strictEqual(Array.isArray(diagnostics), true);
});