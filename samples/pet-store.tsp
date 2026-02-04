// Pet store API models - sample for C# code generation

model Pet {
  id: int64;
  name: string;
  category?: Category;
  photoUrls: string[];
  tags?: Tag[];
  status: "available" | "pending" | "sold";
}

model Category {
  id: int64;
  name: string;
}

model Tag {
  id: int64;
  name: string;
}
