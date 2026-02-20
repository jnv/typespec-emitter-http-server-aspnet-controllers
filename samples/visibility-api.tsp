// Visibility API sample - demonstrates TypeSpec visibility with separate DTOs
// When a model uses @visibility decorators, the emitter produces:
//   - User.cs          (Read DTO: id, name, email, createdAt, role)
//   - UserCreateInput.cs (Create DTO: name, email, password, role)
//   - UserUpdateInput.cs (Update DTO: name?, email?, role?)
import "@typespec/http";
using TypeSpec.Http;

model Account {
  @visibility(Lifecycle.Read) id: int64;
  name: string;
  email: string;
  @visibility(Lifecycle.Create) password: string;
  @visibility(Lifecycle.Read) createdAt: utcDateTime;
  @visibility(Lifecycle.Create, Lifecycle.Update) role?: string;
}

@route("/accounts")
interface Accounts {
  @get list(): Account[];
  @get read(@path id: int64): Account;
  @post create(@body account: Account): Account;
  @patch(#{implicitOptionality: true}) update(@path id: int64, @body account: Account): Account;
}
