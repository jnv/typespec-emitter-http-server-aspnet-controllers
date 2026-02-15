import { t } from "@typespec/compiler/testing";
import { strictEqual } from "node:assert/strict";
import { describe, it } from "vitest";
import { CompileTester } from "./test-host.js";

describe("test host", () => {
  it("returns marked entities from compile", async () => {
    const { Foo } = await CompileTester.compile(t.code`
      model ${t.model("Foo")} {}
    `);
    strictEqual(Foo.name, "Foo");
  });

  it("returns diagnostics from diagnose", async () => {
    const diagnostics = await CompileTester.diagnose(`
      model Bar {}
    `);
    strictEqual(Array.isArray(diagnostics), true);
  });
});
