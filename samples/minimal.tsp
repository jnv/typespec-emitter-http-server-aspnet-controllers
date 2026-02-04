// Minimal sample - mix of scalars, optional, and array

model SimpleEntity {
  id: int32;
  name: string;
  count: int64;
  tags?: string[];
}
