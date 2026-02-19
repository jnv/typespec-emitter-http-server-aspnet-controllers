// Versioned API sample - demonstrates @typespec/versioning support
// Compile separately: this uses @versioned, which produces per-version output directories.
import "@typespec/http";
import "@typespec/versioning";
using TypeSpec.Http;
using TypeSpec.Versioning;

@versioned(Versions)
namespace VersionedApi;

enum Versions {
  v1,
  v2,
}

model Product {
  id: int64;
  name: string;
  @added(Versions.v2) description?: string;
  @removed(Versions.v2) legacyCode?: string;
  price: float64;
}

@route("/products")
interface Products {
  @get list(): Product[];
  @get get(@path id: int64): Product;
  @post create(@body product: Product): Product;
  @added(Versions.v2) @put update(@path id: int64, @body product: Product): Product;
}
