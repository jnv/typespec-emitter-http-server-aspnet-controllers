import { match, ok, strictEqual } from "node:assert/strict";
import { describe, it } from "vitest";
import { Tester } from "./test-host.js";

describe("models", () => {
  it("emits C# class for TypeSpec model", async () => {
    const result = await Tester.compile(`
      model User {
        id: int32;
        name: string;
      }
    `);
    const userCs = result.outputs["Models/User.cs"];
    strictEqual(typeof userCs, "string", "Models/User.cs should be emitted");
    match(userCs, /class User/, "User.cs should contain class User");
    match(userCs, /int\s+Id/, "User.cs should contain Id property of type int");
    match(
      userCs,
      /string\s+Name/,
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
    strictEqual(
      typeof result.outputs["Models/NestedUser.cs"],
      "string",
      "Models/NestedUser.cs should be emitted",
    );
    match(
      result.outputs["Models/NestedUser.cs"],
      /class NestedUser/,
      "Models/NestedUser.cs should contain class NestedUser",
    );
    strictEqual(
      typeof result.outputs["Models/NestedStatus.cs"],
      "string",
      "Models/NestedStatus.cs should be emitted",
    );
    match(
      result.outputs["Models/NestedStatus.cs"],
      /enum NestedStatus/,
      "Models/NestedStatus.cs should contain enum NestedStatus",
    );
  });

  describe("union types", () => {
    it("emits string for string literal union property", async () => {
      const result = await Tester.compile(`
        model Foo {
          status: "active" | "inactive" | "pending";
        }
      `);
      const fooCs = result.outputs["Models/Foo.cs"];
      ok(fooCs, "Models/Foo.cs should be emitted");
      match(fooCs, /string\s+Status/, "string literal union should render as string");
    });

    it("emits nullable int for int32 | null property", async () => {
      const result = await Tester.compile(`
        model Bar {
          count: int32 | null;
        }
      `);
      const barCs = result.outputs["Models/Bar.cs"];
      ok(barCs, "Models/Bar.cs should be emitted");
      match(barCs, /int\?\s+Count/, "int32 | null should render as int?");
    });

    it("emits object for mixed model union property", async () => {
      const result = await Tester.compile(`
        model Cat { meow: string; }
        model Dog { bark: string; }
        model Pet {
          animal: Cat | Dog;
        }
      `);
      const petCs = result.outputs["Models/Pet.cs"];
      ok(petCs, "Models/Pet.cs should be emitted");
      match(petCs, /object\s+Animal/, "mixed model union should render as object");
    });

    it("emits nullable string for string | null property", async () => {
      const result = await Tester.compile(`
        model Baz {
          label: string | null;
        }
      `);
      const bazCs = result.outputs["Models/Baz.cs"];
      ok(bazCs, "Models/Baz.cs should be emitted");
      match(bazCs, /string\?\s+Label/, "string | null should render as string?");
    });

    it("emits double for numeric literal union property", async () => {
      const result = await Tester.compile(`
        model Qux {
          value: 1 | 2 | 3;
        }
      `);
      const quxCs = result.outputs["Models/Qux.cs"];
      ok(quxCs, "Models/Qux.cs should be emitted");
      match(quxCs, /double\s+Value/, "numeric literal union should render as double");
    });
  });
});
