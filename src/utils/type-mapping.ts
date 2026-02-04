import type { ArrayModelType, Model, RecordModelType, Type } from "@typespec/compiler";

const intrinsicNameToCSharpType = new Map<string, string>([
  ["string", "string"],
  ["boolean", "bool"],
  ["int32", "int"],
  ["int64", "long"],
  ["int16", "short"],
  ["int8", "sbyte"],
  ["uint64", "ulong"],
  ["uint32", "uint"],
  ["uint16", "ushort"],
  ["uint8", "byte"],
  ["float32", "float"],
  ["float64", "double"],
  ["decimal", "decimal"],
  ["decimal128", "decimal"],
  ["numeric", "decimal"],
  ["integer", "int"],
  ["float", "float"],
  ["safeint", "int"],
  ["bytes", "byte[]"],
  ["unknown", "object"],
  ["void", "void"],
  ["plainDate", "DateOnly"],
  ["plainTime", "TimeOnly"],
  ["utcDateTime", "DateTimeOffset"],
  ["offsetDateTime", "DateTimeOffset"],
  ["duration", "TimeSpan"],
  ["url", "Uri"],
]);

/**
 * Maps a TypeSpec type to its C# type name.
 */
export function mapTypeSpecTypeToCSharp(type: Type): string {
  switch (type.kind) {
    case "Scalar":
      return intrinsicNameToCSharpType.get(type.name) ?? type.name;
    case "Intrinsic":
      return intrinsicNameToCSharpType.get(type.name) ?? "object";
    case "Model": {
      const model = type as Model;
      if ("indexer" in model && model.indexer) {
        const indexer = model.indexer as
          | ArrayModelType["indexer"]
          | RecordModelType["indexer"];
        if (indexer.value) {
          return `${mapTypeSpecTypeToCSharp(indexer.value)}[]`;
        }
      }
      return model.name;
    }
    case "String":
      return "string";
    case "Number":
      return "int";
    case "Boolean":
      return "bool";
    case "Union": {
      const variants = Array.from(type.variants?.values() ?? []);
      const nullVariant = variants.find(
        (v) => v.type.kind === "Intrinsic" && (v.type as { name: string }).name === "null",
      );
      if (nullVariant && variants.length === 2) {
        const other = variants.find((v) => v !== nullVariant)!;
        return `${mapTypeSpecTypeToCSharp(other.type)}?`;
      }
      return "object";
    }
    default:
      return "object";
  }
}
