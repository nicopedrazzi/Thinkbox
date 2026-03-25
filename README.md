# ThinkBox

ThinkBox is a desktop note-taking app that turns your notes into structured reminders using a local AI model.

## Motivation

My project is an app that lets you write quick notes and come back later, for example I use it while working if something passes trough my mind like : "shoooooot I have to water my plants", I write it there. The cool thing, at least for me, is that I integrated a model, qwen2.5:3b to classify the notes into actual reminders or todo list. This makes organizie my random thoughts even easier, cleaner and faster.



## Quick Start

1. You write notes in the app (everything that pops up in your mind, even when you're working!)
2. Notes are stored in a local SQLite database.
3. On "Generate reminders", ThinkBox sends each unprocessed note to the local model.
4. The model returns structured JSON (category, priority, reminder fields).
5. The app saves and displays generated reminders.

The use of the LLM is not mandatory, is just a nice feature I needed since my notes are super caothic. I use this app while I work or do something else. Is nice to write down a thought that quickly passes trough your mind so you can remind it at the end of the day.



## Prerequisites

- Node.js 18+ (recommended 20+)
- npm
- Ollama installed and available in your shell (`ollama`)
- Local model pulled:

```bash
ollama pull qwen2.5:3b
```
## Features

WHat you can do now:
- Quickly save, update, list, and delete notes.
- Store data locally in SQLite.
- Generate reminders from notes with a local LLM (qwen2.5:3b)
- Show generated reminders with category, priority, and date.
- Run AI generation locally (no cloud API required).

## Tech Stack

- Electron Forge + Vite
- TypeScript
- SQLite (`sqlite` + `sqlite3`)
- Ollama (local runtime)
- Model: `qwen2.5:3b`

## Getting Started

```bash
npm install
npm run start
```

## To run the app

- `npm start` -> run app in development mode


## Local Data

ThinkBox stores its SQLite database in Electron's `userData` folder as:

- `thinkbox.db`


## Current Notes

- AI generation requires `qwen2.5:3b` to be installed locally.
- The app currently focuses on today's notes and reminder generation flow.
- UI and feature extensions (for example todo sync/window) are planned next.

This is version 1, still a bit rusty. I have planned a switch to react in the next weeks as soon as I have time. After that I will share more information on a roadmap, I have a few ideas that will 100% improve the quality of life of the users of this app.

You are welcome to contribute or contact me for collaboration. I don't plan to use this commercially, is just a fun little project that helps in my everyday life.

Please if you want to collaborate, I ask not to submit AI slop. 


### Submit a pull request

If you'd like to contribute, please fork the repository and open a pull request to the `main` branch.


## License

MIT
