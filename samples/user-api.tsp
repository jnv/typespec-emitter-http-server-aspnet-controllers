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

model UserListResponse {
  items: User[];
  @header("X-Request-Id") requestId?: string;
  @header("X-Total-Count") totalCount?: string;
}

model UserResponse {
  user: User;
  @header("ETag") etag: string;
}

@route("/users")
interface Users {
  @get list(): UserListResponse;
  @get get(@path id: int64): UserResponse;
  @post create(@body user: User): User;
}
