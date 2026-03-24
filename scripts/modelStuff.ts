import { app } from "electron";
import { ChildProcess } from "node:child_process";
import path from "node:path";

type Model = {
  name?: string;
  model?: string;
};

type Payload = {
  models?: Model[];
};

const defaultModelPort = 11434;
export const defaultModel = 'qwen2.5:3b';
export const MODEL_HOST = `127.0.0.1:${defaultModelPort}`;
export const MODEL_BASE_URL = `http://${MODEL_HOST}`;

let modelProcess: ChildProcess;


export function getPromptPath(){
    return path.resolve(process.cwd(), 'src', 'assets', 'notePrompt.txt');
}

export async function isModelServerReady(){
    try {
    const response = await fetch(`${MODEL_BASE_URL}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function waitForServer(timeoutMs = 30000){
    const startedAt = Date.now();
    while (Date.now()-startedAt < timeoutMs){
        if (await isModelServerReady()){
            return;
        }
        throw new Error("Server not ready");
    }
}

export async function listInstalledModels(){
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

export async function checkConfiguredModelIsAvailable(){
  const modelNames = await listInstalledModels();
  if (modelNames.includes(defaultModel)) {
    return;
  }
  throw new Error(
    `Model "${defaultModel}" is not available`);
}


