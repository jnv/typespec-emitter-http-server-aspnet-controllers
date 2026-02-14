import { t } from "@typespec/compiler/testing";
import { match, strictEqual } from "node:assert/strict";
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

  it("emits operations interface and controller with mediator pattern", async () => {
    const result = await Tester.compile(`
      import "@typespec/http";
      using TypeSpec.Http;

      model User {
        id: int64;
        name: string;
      }

      @route("/users")
      interface Users {
        @get list(): User[];
        @get get(@path id: int64): User;
      }
    `);

    const iUsers = result.outputs["Operations/IUsers.cs"];
    strictEqual(
      typeof iUsers,
      "string",
      "Operations/IUsers.cs should be emitted",
    );
    match(
      iUsers,
      /public interface IUsers/,
      "IUsers interface should be declared",
    );
    match(
      iUsers,
      /Task<|ListAsync|CancellationToken cancellationToken = default/,
      "IUsers should declare async methods with CancellationToken",
    );

    const controller = result.outputs["Controllers/UsersController.cs"];
    strictEqual(
      typeof controller,
      "string",
      "Controllers/UsersController.cs should be emitted",
    );
    match(
      controller,
      /public partial class UsersController/,
      "Controller should be partial class",
    );
    match(
      controller,
      /IUsers operations/,
      "Controller should take IUsers in constructor",
    );
    match(
      controller,
      /_operations/,
      "Controller should store operations in field",
    );
    match(
      controller,
      /CancellationToken cancellationToken/,
      "Controller actions should take CancellationToken and call operations",
    );
    match(
      controller,
      /await _operations\./,
      "Controller actions should await operations",
    );
    match(
      controller,
      /return Ok\(result\)/,
      "Controller should return Ok(result)",
    );
  });

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
