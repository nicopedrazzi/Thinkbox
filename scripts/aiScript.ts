
import { readFile } from 'node:fs/promises';
import path from 'node:path';

type NoteClassification = {
  category: 'work' | 'personal' | 'shopping' | 'idea' | 'todo' | 'other';
  shouldCreateReminder: boolean;
  reminderTitle: string | null;
  reminderText: string | null;
  reminderDate: string | null;
  priority: 'low' | 'medium' | 'high';
};

const parseModelJson = (raw: string): NoteClassification => {
  try {
    return JSON.parse(raw) as NoteClassification;
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(raw.slice(start, end + 1)) as NoteClassification;
    }

    throw new Error('Model did not return valid JSON.');
  }
};

const PROMPT_FILE_PATH = path.resolve(process.cwd(), 'src/assets/notePrompt.txt');

const promptPromise = readFile(PROMPT_FILE_PATH, 'utf8');

export async function classifyWithLocalModel(content: string): Promise<NoteClassification> {
  const noteText = content.trim();
  if (!noteText) {
    throw new Error('Cannot classify an empty note.');
  }

  const prompt = await promptPromise;
  const finalPrompt = `${prompt}\n\nClassify this note:\n${noteText}`;

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen2.5:3b',
      prompt: finalPrompt,
      stream: false,
      format: 'json',
    }),
  });

  if (!response.ok) {
    throw new Error(`Local model request failed (${response.status} ${response.statusText}).`);
  }

  const data = (await response.json()) as { error?: string; response?: string };
  if (data.error) {
    throw new Error(`Local model error: ${data.error}`);
  }

  if (!data.response) {
    throw new Error('Local model returned an empty response.');
  }

  return parseModelJson(data.response);
}
