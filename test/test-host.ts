import { resolvePath } from "@typespec/compiler";
import { createTester } from "@typespec/compiler/testing";
// import {
//   createTestHost,
//   createTestWrapper,
//   expectDiagnosticEmpty,
// } from "@typespec/compiler/testing";
// import { HttpServerAspnetTestLibrary } from "../src/testing/index.js";

// export async function createHttpServerAspnetTestHost() {
//   return createTestHost({
//     libraries: [HttpServerAspnetTestLibrary],
//   });
// }

// export async function createHttpServerAspnetTestRunner() {
//   const host = await createHttpServerAspnetTestHost();

//   return createTestWrapper(host, {
//     compilerOptions: {
//       noEmit: false,
//       emit: ["http-server-aspnet"],
//     },
//   });
// }

// export async function emitWithDiagnostics(
//   code: string
// ): Promise<[Record<string, string>, readonly Diagnostic[]]> {
//   const runner = await createHttpServerAspnetTestRunner();
//   await runner.compileAndDiagnose(code, {
//     outputDir: "tsp-output",
//   });
//   const emitterOutputDir = "./tsp-output/http-server-aspnet";
//   const files = await runner.program.host.readDir(emitterOutputDir);

//   const result: Record<string, string> = {};
//   for (const file of files) {
//     result[file] = (await runner.program.host.readFile(resolvePath(emitterOutputDir, file))).text;
//   }
//   return [result, runner.program.diagnostics];
// }

// export async function emit(code: string): Promise<Record<string, string>> {
//   const [result, diagnostics] = await emitWithDiagnostics(code);
//   expectDiagnosticEmpty(diagnostics);
//   return result;
// }

// https://typespec.io/docs/extending-typespec/testing/#define-the-tester
export const Tester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [],
});