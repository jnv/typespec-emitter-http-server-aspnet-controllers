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
    const userCs = result.outputs["Models/User.cs"];
    strictEqual(typeof userCs, "string", "Models/User.cs should be emitted");
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
    strictEqual(typeof result.outputs["Models/NestedUser.cs"], "string", "Models/NestedUser.cs should be emitted");
    strictEqual(
      result.outputs["Models/NestedUser.cs"].includes("class NestedUser"),
      true,
      "Models/NestedUser.cs should contain class NestedUser",
    );
    strictEqual(typeof result.outputs["Models/NestedStatus.cs"], "string", "Models/NestedStatus.cs should be emitted");
    strictEqual(
      result.outputs["Models/NestedStatus.cs"].includes("enum NestedStatus"),
      true,
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
    strictEqual(typeof iUsers, "string", "Operations/IUsers.cs should be emitted");
    strictEqual(iUsers.includes("public interface IUsers"), true, "IUsers interface should be declared");
    strictEqual(
      iUsers.includes("Task<") && iUsers.includes("ListAsync") && iUsers.includes("CancellationToken cancellationToken = default"),
      true,
      "IUsers should declare async methods with CancellationToken",
    );

    const controller = result.outputs["Controllers/UsersController.cs"];
    strictEqual(typeof controller, "string", "Controllers/UsersController.cs should be emitted");
    strictEqual(controller.includes("public partial class UsersController"), true, "Controller should be partial class");
    strictEqual(controller.includes("IUsers operations"), true, "Controller should take IUsers in constructor");
    strictEqual(controller.includes("_operations"), true, "Controller should store operations in field");
    strictEqual(
      controller.includes("CancellationToken cancellationToken") && controller.includes("await _operations."),
      true,
      "Controller actions should take CancellationToken and call operations",
    );
    strictEqual(controller.includes("return Ok(result)") || controller.includes("return Ok(result);"), true, "Controller should return Ok(result)");
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