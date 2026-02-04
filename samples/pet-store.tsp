// Pet store API models - sample for C# code generation

enum PetStatus {
  available,
  pending,
  sold,
}

model Pet {
  id: int64;
  name: string;
  category?: Category;
  photoUrls: string[];
  tags?: Tag[];
  status: PetStatus;
}

model Category {
  id: int64;
  name: string;
}

model Tag {
  id: int64;
  name: string;
}
