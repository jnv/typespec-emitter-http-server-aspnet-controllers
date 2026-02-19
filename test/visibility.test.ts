import { doesNotMatch, match, ok, strictEqual } from "node:assert/strict";
import { describe, it } from "vitest";
import { Tester } from "./test-host.js";

describe("visibility", () => {
  it("emits separate Create DTO when model has visibility decorators", async () => {
    const result = await Tester.compile(`
      import "@typespec/http";
      using TypeSpec.Http;

      model User {
        @visibility(Lifecycle.Read) id: int64;
        name: string;
        email: string;
        @visibility(Lifecycle.Create) password: string;
        @visibility(Lifecycle.Read) createdAt: utcDateTime;
      }

      @route("/users")
      interface Users {
        @get list(): User[];
        @post create(@body user: User): User;
      }
    `);

    const userModel = result.outputs["Models/User.cs"];
    ok(userModel, "Models/User.cs should exist");
    match(userModel, /Id/, "User model should have Id property");
    match(userModel, /Name/, "User model should have Name property");
    match(userModel, /CreatedAt/, "User model should have CreatedAt property");

    const createInput = result.outputs["Models/UserCreateInput.cs"];
    ok(createInput, "Models/UserCreateInput.cs should exist");
    match(createInput, /class UserCreateInput/, "Should have UserCreateInput class");
    match(createInput, /Name/, "CreateInput should have Name property");
    match(createInput, /Password/, "CreateInput should have Password property");
    doesNotMatch(createInput, /\bId\b/, "CreateInput should not have Id property");
    doesNotMatch(
      createInput,
      /CreatedAt/,
      "CreateInput should not have CreatedAt property",
    );
  });

  it("emits Update DTO with all optional properties", async () => {
    const result = await Tester.compile(`
      import "@typespec/http";
      using TypeSpec.Http;

      model User {
        @visibility(Lifecycle.Read) id: int64;
        name: string;
        email: string;
        @visibility(Lifecycle.Create) password: string;
        @visibility(Lifecycle.Read) createdAt: utcDateTime;
      }

      @route("/users")
      interface Users {
        @get list(): User[];
        @post create(@body user: User): User;
        @patch(#{implicitOptionality: true}) update(@path id: int64, @body user: User): User;
      }
    `);

    const updateInput = result.outputs["Models/UserUpdateInput.cs"];
    ok(updateInput, "Models/UserUpdateInput.cs should exist");
    match(updateInput, /class UserUpdateInput/, "Should have UserUpdateInput class");
    // Update DTOs should have nullable/optional types (trailing ?)
    match(updateInput, /\?/, "Update DTO properties should be nullable");
    doesNotMatch(
      updateInput,
      /\bId\b/,
      "UpdateInput should not have Id property (Read-only)",
    );
    doesNotMatch(
      updateInput,
      /Password/,
      "UpdateInput should not have Password property (Create-only)",
    );
  });

  it("uses Create DTO type in operations interface for POST body", async () => {
    const result = await Tester.compile(`
      import "@typespec/http";
      using TypeSpec.Http;

      model User {
        @visibility(Lifecycle.Read) id: int64;
        name: string;
        @visibility(Lifecycle.Create) password: string;
      }

      @route("/users")
      interface Users {
        @get list(): User[];
        @post create(@body user: User): User;
      }
    `);

    const iUsers = result.outputs["Operations/IUsers.cs"];
    ok(iUsers, "Operations/IUsers.cs should exist");
    match(
      iUsers,
      /UserCreateInput/,
      "Operations interface should reference UserCreateInput for POST body",
    );
  });

  it("uses Update DTO type in controller for PATCH body", async () => {
    const result = await Tester.compile(`
      import "@typespec/http";
      using TypeSpec.Http;

      model User {
        @visibility(Lifecycle.Read) id: int64;
        name: string;
        @visibility(Lifecycle.Create) password: string;
      }

      @route("/users")
      interface Users {
        @get get(@path id: int64): User;
        @post create(@body user: User): User;
        @patch(#{implicitOptionality: true}) update(@path id: int64, @body user: User): User;
      }
    `);

    const controller = result.outputs["Controllers/UsersController.cs"];
    ok(controller, "Controllers/UsersController.cs should exist");
    match(
      controller,
      /UserUpdateInput/,
      "Controller should use UserUpdateInput for PATCH body parameter",
    );
  });

  it("does not emit separate DTOs when no visibility decorators", async () => {
    const result = await Tester.compile(`
      import "@typespec/http";
      using TypeSpec.Http;

      model User {
        id: int64;
        name: string;
        email: string;
      }

      @route("/users")
      interface Users {
        @get list(): User[];
        @post create(@body user: User): User;
      }
    `);

    ok(result.outputs["Models/User.cs"], "Models/User.cs should exist");

    const outputFiles = Object.keys(result.outputs);
    const hasCreateInput = outputFiles.some((f) =>
      f.includes("CreateInput"),
    );
    const hasUpdateInput = outputFiles.some((f) =>
      f.includes("UpdateInput"),
    );
    strictEqual(
      hasCreateInput,
      false,
      "Should not emit CreateInput when no visibility decorators",
    );
    strictEqual(
      hasUpdateInput,
      false,
      "Should not emit UpdateInput when no visibility decorators",
    );
  });

  it("does not emit filtered DTOs for response-only models", async () => {
    const result = await Tester.compile(`
      import "@typespec/http";
      using TypeSpec.Http;

      model StatusResult {
        @visibility(Lifecycle.Read) status: string;
        @visibility(Lifecycle.Read) timestamp: utcDateTime;
      }

      @route("/status")
      interface Status {
        @get check(): StatusResult;
      }
    `);

    ok(result.outputs["Models/StatusResult.cs"], "Models/StatusResult.cs should exist");

    const outputFiles = Object.keys(result.outputs);
    const hasFilteredDtos = outputFiles.some(
      (f) => f.includes("CreateInput") || f.includes("UpdateInput"),
    );
    strictEqual(
      hasFilteredDtos,
      false,
      "Should not emit filtered DTOs for models only used in responses",
    );
  });
});
