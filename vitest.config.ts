import alloyPlugin from "@alloy-js/rollup-plugin";
import { defineConfig } from "vitest/config";
// https://typespec.io/docs/extending-typespec/testing/
export default defineConfig({
  test: {
    environment: "node",
    isolate: false,
  },
  esbuild: {
    jsx: "preserve",
    sourcemap: "both",
  },
  plugins: [
    alloyPlugin(),
  ],
});
