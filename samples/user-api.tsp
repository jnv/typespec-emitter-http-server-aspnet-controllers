// User API models - sample for C# code generation
import "@typespec/http";
using TypeSpec.Http;

model User {
  id: int64;
  email: string;
  name?: string;
  address?: Address;
  createdAt: utcDateTime;
  isActive: boolean = true;
}

model Address {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

@route("/users")
interface Users {
  @get list(): User[];
  @get get(@path id: int64): User;
  @post create(@body user: User): User;
}
