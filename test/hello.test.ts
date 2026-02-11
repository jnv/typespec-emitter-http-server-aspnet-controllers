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
    const userCs = result.outputs["User.cs"];
    strictEqual(typeof userCs, "string", "User.cs should be emitted");
    strictEqual(
      userCs.includes("class User"),
      true,
      "User.cs should contain class User",
    );
    strictEqual(
      userCs.includes("Id") && userCs.includes("int"),
      true,
      "User.cs should contain Id property of type int",
    );
    strictEqual(
      userCs.includes("Name") && userCs.includes("string"),
      true,
      "User.cs should contain Name property of type string",
    );
  });

  it("emits models and enums from nested namespaces", async () => {
    const result = await Tester.compile(`
      namespace Api {
        model NestedUser {
          id: int32;
          name: string;
        }
        enum NestedStatus {
          active,
          inactive,
        }
      }
    `);
    strictEqual(typeof result.outputs["NestedUser.cs"], "string", "NestedUser.cs should be emitted");
    strictEqual(
      result.outputs["NestedUser.cs"].includes("class NestedUser"),
      true,
      "NestedUser.cs should contain class NestedUser",
    );
    strictEqual(typeof result.outputs["NestedStatus.cs"], "string", "NestedStatus.cs should be emitted");
    strictEqual(
      result.outputs["NestedStatus.cs"].includes("enum NestedStatus"),
      true,
      "NestedStatus.cs should contain enum NestedStatus",
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