import { doesNotMatch, match, ok, strictEqual } from "node:assert/strict";
import { describe, it } from "vitest";
import { Tester } from "./test-host.js";

describe("versioning", () => {
  it("emits separate directories per version", async () => {
    const result = await Tester.compile(`
      import "@typespec/http";
      import "@typespec/versioning";
      using TypeSpec.Http;
      using TypeSpec.Versioning;

      @versioned(Versions)
      namespace TestService;

      enum Versions { v1, v2 }

      model User {
        id: int64;
        name: string;
      }

      @route("/users")
      interface Users {
        @get list(): User[];
      }
    `);

    const outputFiles = Object.keys(result.outputs);
    ok(
      outputFiles.some((f) => f.startsWith("v1/")),
      "should have v1/ directory output files",
    );
    ok(
      outputFiles.some((f) => f.startsWith("v2/")),
      "should have v2/ directory output files",
    );
    ok(result.outputs["v1/Models/User.cs"], "v1/Models/User.cs should exist");
    ok(result.outputs["v2/Models/User.cs"], "v2/Models/User.cs should exist");
    ok(
      result.outputs["v1/Controllers/UsersController.cs"],
      "v1/Controllers/UsersController.cs should exist",
    );
    ok(
      result.outputs["v2/Controllers/UsersController.cs"],
      "v2/Controllers/UsersController.cs should exist",
    );
  });

  it("includes only types available in each version", async () => {
    const result = await Tester.compile(`
      import "@typespec/http";
      import "@typespec/versioning";
      using TypeSpec.Http;
      using TypeSpec.Versioning;

      @versioned(Versions)
      namespace TestService;

      enum Versions { v1, v2 }

      model User {
        id: int64;
        name: string;
        @added(Versions.v2) email?: string;
      }

      @route("/users")
      interface Users {
        @get list(): User[];
      }
    `);

    const v1User = result.outputs["v1/Models/User.cs"];
    const v2User = result.outputs["v2/Models/User.cs"];
    ok(v1User, "v1/Models/User.cs should exist");
    ok(v2User, "v2/Models/User.cs should exist");

    doesNotMatch(v1User, /Email/, "v1 User should not have Email property");
    match(v2User, /Email/, "v2 User should have Email property");
  });

  it("handles @removed decorator", async () => {
    const result = await Tester.compile(`
      import "@typespec/http";
      import "@typespec/versioning";
      using TypeSpec.Http;
      using TypeSpec.Versioning;

      @versioned(Versions)
      namespace TestService;

      enum Versions { v1, v2 }

      model Item {
        id: int64;
        @removed(Versions.v2) legacyField?: string;
        name: string;
      }

      @route("/items")
      interface Items {
        @get list(): Item[];
      }
    `);

    const v1Item = result.outputs["v1/Models/Item.cs"];
    const v2Item = result.outputs["v2/Models/Item.cs"];
    ok(v1Item, "v1/Models/Item.cs should exist");
    ok(v2Item, "v2/Models/Item.cs should exist");

    match(v1Item, /LegacyField/, "v1 Item should have LegacyField");
    doesNotMatch(v2Item, /LegacyField/, "v2 Item should not have LegacyField");
  });

  it("emits version-specific namespaces", async () => {
    const result = await Tester.compile(`
      import "@typespec/http";
      import "@typespec/versioning";
      using TypeSpec.Http;
      using TypeSpec.Versioning;

      @versioned(Versions)
      namespace TestService;

      enum Versions { v1, v2 }

      model User {
        id: int64;
        name: string;
      }

      @route("/users")
      interface Users {
        @get list(): User[];
      }
    `);

    const v1Controller = result.outputs["v1/Controllers/UsersController.cs"];
    const v2Controller = result.outputs["v2/Controllers/UsersController.cs"];
    ok(v1Controller, "v1 controller should exist");
    ok(v2Controller, "v2 controller should exist");

    match(
      v1Controller,
      /Generated\.V1\.Controllers/,
      "v1 controller should use V1 namespace",
    );
    match(
      v2Controller,
      /Generated\.V2\.Controllers/,
      "v2 controller should use V2 namespace",
    );
  });

  it("emits normally when no versioning is used", async () => {
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
      }
    `);

    ok(result.outputs["Models/User.cs"], "Models/User.cs should exist (flat)");
    ok(
      result.outputs["Controllers/UsersController.cs"],
      "Controllers/UsersController.cs should exist (flat)",
    );

    const outputFiles = Object.keys(result.outputs);
    const hasVersionedPaths = outputFiles.some(
      (f) => f.startsWith("v1/") || f.startsWith("v2/"),
    );
    strictEqual(
      hasVersionedPaths,
      false,
      "non-versioned output should not have version directories",
    );
  });

  it("handles @added on operations", async () => {
    const result = await Tester.compile(`
      import "@typespec/http";
      import "@typespec/versioning";
      using TypeSpec.Http;
      using TypeSpec.Versioning;

      @versioned(Versions)
      namespace TestService;

      enum Versions { v1, v2 }

      model User {
        id: int64;
        name: string;
      }

      @route("/users")
      interface Users {
        @get list(): User[];
        @added(Versions.v2) @get get(@path id: int64): User;
      }
    `);

    const v1Interface = result.outputs["v1/Operations/IUsers.cs"];
    const v2Interface = result.outputs["v2/Operations/IUsers.cs"];
    ok(v1Interface, "v1 operations interface should exist");
    ok(v2Interface, "v2 operations interface should exist");

    doesNotMatch(
      v1Interface,
      /GetAsync/,
      "v1 interface should not have GetAsync",
    );
    match(v2Interface, /GetAsync/, "v2 interface should have GetAsync");
  });
});
