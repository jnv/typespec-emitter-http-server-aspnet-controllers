// User API models - sample for C# code generation

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
