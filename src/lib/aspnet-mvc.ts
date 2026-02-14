import { createLibrary } from "@alloy-js/csharp";

/**
 * ASP.NET Core MVC library symbol references.
 * Auto-generates `using Microsoft.AspNetCore.Mvc;` when referenced.
 */
export const AspNetMvc = createLibrary("Microsoft.AspNetCore.Mvc", {
  ControllerBase: { kind: "class", members: {} },
  IActionResult: { kind: "interface", members: {} },
  ActionResult: { kind: "class", members: {} },

  // Attributes — Alloy auto-strips "Attribute" suffix in [brackets]
  ApiControllerAttribute: { kind: "class", members: {} },
  RouteAttribute: { kind: "class", members: {} },
  FromRouteAttribute: { kind: "class", members: {} },
  FromQueryAttribute: { kind: "class", members: {} },
  FromBodyAttribute: { kind: "class", members: {} },
  FromHeaderAttribute: { kind: "class", members: {} },
  HttpGetAttribute: { kind: "class", members: {} },
  HttpPostAttribute: { kind: "class", members: {} },
  HttpPutAttribute: { kind: "class", members: {} },
  HttpPatchAttribute: { kind: "class", members: {} },
  HttpDeleteAttribute: { kind: "class", members: {} },
  HttpHeadAttribute: { kind: "class", members: {} },
});
