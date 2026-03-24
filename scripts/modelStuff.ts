import { ChildProcess, spawn } from 'node:child_process';
import path from 'node:path';

type Model = {
  name?: string;
  model?: string;
};

type Payload = {
  models?: Model[];
};

export type RuntimeSource = 'external' | 'bundled' | 'system';

const defaultModelPort = 11434;
export const defaultModel = 'qwen2.5:3b';
export const MODEL_HOST = `127.0.0.1:${defaultModelPort}`;
export const MODEL_BASE_URL = `http://${MODEL_HOST}`;

let modelProcess: ChildProcess | null = null;
let runtimeSource: RuntimeSource | null = null;
let modelBootstrapPromise: Promise<void> | null = null;
let lastRuntimeError = '';
const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const buildModelEnvironment = (): NodeJS.ProcessEnv => ({
  ...process.env,
  OLLAMA_HOST: MODEL_HOST,
});

export function getPromptPath(): string {
  return path.resolve(process.cwd(), 'src', 'assets', 'notePrompt.txt');
}

export async function isModelServerReady(): Promise<boolean> {
  try {
    const response = await fetch(`${MODEL_BASE_URL}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function waitForServer(timeoutMs = 30000): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isModelServerReady()) {
      return;
    }
    await wait(300);
  }

  if (lastRuntimeError) {
    throw new Error(`Server not ready. Last runtime error: ${lastRuntimeError}`);
  }
  throw new Error('Server not ready');
}

export async function startModel(command = 'ollama'): Promise<void> {
  if (modelProcess && modelProcess.exitCode === null) {
    return;
  }

  const child = spawn(command, ['serve'], {
    env: buildModelEnvironment(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  modelProcess = child;
  lastRuntimeError = '';

  child.stderr?.on('data', (chunk: Buffer) => {
    const line = chunk.toString('utf8').trim();
    if (!line) {
      return;
    }
    lastRuntimeError = line;
    console.error(`[Model Runtime] ${line}`);
  });

  child.stdout?.on('data', (chunk: Buffer) => {
    const line = chunk.toString('utf8').trim();
    if (!line) {
      return;
    }
    console.log(`[Model Runtime] ${line}`);
  });

  child.once('exit', () => {
    if (modelProcess === child) {
      modelProcess = null;
    }
  });

  await new Promise<void>((resolve, reject) => {
    child.once('spawn', () => resolve());
    child.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        reject(new Error(`Could not find "${command}". Install Ollama or pass a valid command.`));
        return;
      }
      reject(new Error(`Failed to launch model runtime: ${error.message}`));
    });
  });

  await waitForServer();
}

export async function listInstalledModels(): Promise<string[]> {
  const response = await fetch(`${MODEL_BASE_URL}/api/tags`);
  if (!response.ok) {
    throw new Error(`Failed to list local models (${response.status} ${response.statusText}).`);
  }

  const raw = await response.json();
  const payload = raw as Payload;

  return (payload.models ?? [])
    .flatMap((item) => [item.name, item.model])
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
}

export async function checkConfiguredModelIsAvailable(): Promise<void> {
  const modelNames = await listInstalledModels();
  if (modelNames.includes(defaultModel)) {
    return;
  }
  throw new Error(`Model "${defaultModel}" is not available`);
}

const bootModelRuntime = async (): Promise<void> => {
  if (await isModelServerReady()) {
    runtimeSource = 'external';
    await checkConfiguredModelIsAvailable();
    return;
  }

  await startModel('ollama');
  runtimeSource = 'system';
  await checkConfiguredModelIsAvailable();
};

export const ensureModelRuntimeReady = async (): Promise<void> => {
  if (!modelBootstrapPromise) {
    modelBootstrapPromise = bootModelRuntime().catch((error: unknown) => {
      if (runtimeSource !== 'external') {
        stopModelRuntime();
      }
      modelBootstrapPromise = null;
      throw error;
    });
  }

  await modelBootstrapPromise;
};

export const stopModelRuntime = (): void => {
  if (modelProcess && !modelProcess.killed && modelProcess.exitCode === null) {
    modelProcess.kill('SIGTERM');
  }
  modelProcess = null;
  runtimeSource = null;
  modelBootstrapPromise = null;
};

export const getModelRuntimeSource = (): RuntimeSource | null => runtimeSource;
