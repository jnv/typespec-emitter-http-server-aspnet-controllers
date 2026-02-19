// Main entrypoint - imports all sample specs for compilation
// Note: versioned-api.tsp is compiled separately via main-versioned.tsp
// because @versioned produces per-version output directories.
import "@typespec/http";
import "./minimal.tsp";
import "./pet-store.tsp";
import "./user-api.tsp";
import "./inventory.tsp";
import "./reservation-api.tsp";
import "./visibility-api.tsp";
