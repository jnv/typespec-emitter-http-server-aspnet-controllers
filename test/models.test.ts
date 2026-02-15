import { match, strictEqual } from "node:assert/strict";
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
});
