// Entry point for the versioned API sample
// Compile separately from main.tsp because @versioned produces per-version directories.
import "@typespec/http";
import "@typespec/versioning";
import "./versioned-api.tsp";
