// Ensure process.env exists when the module is loaded directly in the browser UMD build.
type GlobalWithProcess = typeof globalThis & { process?: NodeJS.Process };

const globalObject =
  typeof globalThis !== 'undefined' ? (globalThis as GlobalWithProcess) : undefined;

if (globalObject) {
  if (!globalObject.process) {
    globalObject.process = {
      env: { NODE_ENV: 'production' } as NodeJS.ProcessEnv,
    } as NodeJS.Process;
  } else {
    const env = globalObject.process.env ?? (globalObject.process.env = {} as NodeJS.ProcessEnv);
    if (typeof env.NODE_ENV === 'undefined') {
      env.NODE_ENV = 'production';
    }
  }
}

export * from './core/index.js';
export * from './types.js';
