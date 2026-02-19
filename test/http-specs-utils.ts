import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

export interface HttpSpec {
  /** Relative path like "parameters/basic" */
  category: string;
  /** Full absolute path to the main.tsp file */
  absolutePath: string;
}

/**
 * Resolves the root directory of the installed @typespec/http-specs package.
 * Uses package.json resolution since the package's main entry doesn't exist.
 */
function getHttpSpecsRoot(): string {
  return resolve(import.meta.dirname, "..", "node_modules", "@typespec", "http-specs");
}

/**
 * Discovers all main.tsp spec files from the installed @typespec/http-specs package.
 * Returns them sorted by category for deterministic test order.
 */
export async function discoverHttpSpecs(): Promise<HttpSpec[]> {
  const root = getHttpSpecsRoot();
  const specsDir = resolve(root, "specs");
  const allFiles = await readdir(specsDir, { recursive: true });
  const mainTspFiles = allFiles
    .filter((f) => f.endsWith("/main.tsp") || f === "main.tsp")
    .sort();

  return mainTspFiles.map((relativePath) => ({
    category: relativePath.replace(/[/\\]main\.tsp$/, ""),
    absolutePath: resolve(specsDir, relativePath),
  }));
}

/**
 * Reads the content of a spec file.
 */
export async function readSpecContent(spec: HttpSpec): Promise<string> {
  return readFile(spec.absolutePath, "utf-8");
}
