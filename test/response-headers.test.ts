import { strictEqual } from "node:assert";
import { describe, it } from "vitest";
import { Tester } from "./test-host.js";

describe("response headers", () => {
  it("emits controller that sets optional response header with null check", async () => {
    const result = await Tester.compile(`
      import "@typespec/http";
      using TypeSpec.Http;

      model ItemListResult {
        items: string[];
        @header("Link") link?: string;
      }

      @route("/items")
      interface Items {
        @get list(): ItemListResult;
      }
    `);

    const controller = result.outputs["Controllers/ItemsController.cs"];
    strictEqual(typeof controller, "string", "Controllers/ItemsController.cs should be emitted");

    strictEqual(
      controller.includes('Response.Headers["Link"]'),
      true,
      "Controller should set Response.Headers[\"Link\"]",
    );

    strictEqual(
      controller.includes("result.Link != null"),
      true,
      "Controller should null-check optional header property",
    );

    strictEqual(
      controller.includes("return Ok(result)"),
      true,
      "Controller should return Ok(result)",
    );
  });

  it("emits controller that sets required response header without null check", async () => {
    const result = await Tester.compile(`
      import "@typespec/http";
      using TypeSpec.Http;

      model ResultWithETag {
        value: string;
        @header("ETag") etag: string;
      }

      @route("/things")
      interface Things {
        @get read(): ResultWithETag;
      }
    `);

    const controller = result.outputs["Controllers/ThingsController.cs"];
    strictEqual(typeof controller, "string", "Controllers/ThingsController.cs should be emitted");

    strictEqual(
      controller.includes('Response.Headers["ETag"]'),
      true,
      "Controller should set Response.Headers[\"ETag\"]",
    );

    strictEqual(
      controller.includes("result.Etag != null"),
      false,
      "Controller should not null-check required header property",
    );
  });

  it("emits controller that sets multiple response headers", async () => {
    const result = await Tester.compile(`
      import "@typespec/http";
      using TypeSpec.Http;

      model PagedResult {
        items: string[];
        @header("Link") link?: string;
        @header("X-Request-Id") requestId: string;
        @header("X-Total-Count") totalCount?: string;
      }

      @route("/resources")
      interface Resources {
        @get list(): PagedResult;
      }
    `);

    const controller = result.outputs["Controllers/ResourcesController.cs"];
    strictEqual(typeof controller, "string", "Controllers/ResourcesController.cs should be emitted");

    strictEqual(
      controller.includes('Response.Headers["Link"]'),
      true,
      "Controller should set Link header",
    );

    strictEqual(
      controller.includes('Response.Headers["X-Request-Id"]'),
      true,
      "Controller should set X-Request-Id header",
    );

    strictEqual(
      controller.includes('Response.Headers["X-Total-Count"]'),
      true,
      "Controller should set X-Total-Count header",
    );
  });

  it("does not emit Response.Headers when no response headers exist", async () => {
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

    const controller = result.outputs["Controllers/UsersController.cs"];
    strictEqual(typeof controller, "string", "Controllers/UsersController.cs should be emitted");

    strictEqual(
      controller.includes("Response.Headers"),
      false,
      "Controller should not set any Response.Headers when no response headers exist",
    );
  });

  it("operations interface return type includes header properties", async () => {
    const result = await Tester.compile(`
      import "@typespec/http";
      using TypeSpec.Http;

      model ItemListResult {
        items: string[];
        @header("Link") link?: string;
      }

      @route("/items")
      interface Items {
        @get list(): ItemListResult;
      }
    `);

    const iItems = result.outputs["Operations/IItems.cs"];
    strictEqual(typeof iItems, "string", "Operations/IItems.cs should be emitted");
    strictEqual(
      iItems.includes("ItemListResult"),
      true,
      "Interface should return the full model type including header properties",
    );
  });
});
