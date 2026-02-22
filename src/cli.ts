#!/usr/bin/env node

import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { emitKeypressEvents } from "node:readline";
import { createInterface } from "node:readline/promises";

const VERSION = "0.1.0";
const INCLUDED_TEMPLATES: Record<string, string> = {
  "astro-cloudflare-blog":
    "kousaku-maron/template-manager/templates/astro-cloudflare-blog",
  "tauri-cloudflare-todo":
    "kousaku-maron/template-manager/templates/tauri-cloudflare-todo",
};

type CliOptions = {
  template?: string;
  dir?: string;
  help?: boolean;
  version?: boolean;
  force: boolean;
};

function usage(): void {
  console.log(`template-manager

Usage:
  npx @kousaku-maron/template-manager --template=<owner/repo/path> [options]

Options:
  -t, --template   Source template (required)
  -d, --dir        Output directory (default: template folder name)
  -f, --force      Overwrite existing output directory
  -h, --help       Show help
  -v, --version    Show version

Examples:
  npx @kousaku-maron/template-manager --template=cloudflare/templates/astro-blog-starter-template
  npx @kousaku-maron/template-manager --template=owner/repo/templates/next-app --dir=my-app
  npx @kousaku-maron/template-manager --template=astro-cloudflare-blog --dir=my-blog
  npx @kousaku-maron/template-manager --template=tauri-cloudflare-todo --dir=my-kanban
`);
}

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    force: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--") {
      continue;
    }

    if (arg === "-h" || arg === "--help") {
      options.help = true;
      continue;
    }
    if (arg === "-v" || arg === "--version") {
      options.version = true;
      continue;
    }
    if (arg === "-f" || arg === "--force") {
      options.force = true;
      continue;
    }

    if (arg === "-t" || arg === "--template") {
      const value = argv[i + 1];
      if (!value || value.startsWith("-")) {
        fail("--template requires a value");
      }
      options.template = value;
      i += 1;
      continue;
    }
    if (arg.startsWith("--template=")) {
      const value = arg.slice("--template=".length);
      if (!value) {
        fail("--template requires a value");
      }
      options.template = value;
      continue;
    }

    if (arg === "-d" || arg === "--dir") {
      const value = argv[i + 1];
      if (!value || value.startsWith("-")) {
        fail("--dir requires a value");
      }
      options.dir = value;
      i += 1;
      continue;
    }
    if (arg.startsWith("--dir=")) {
      const value = arg.slice("--dir=".length);
      if (!value) {
        fail("--dir requires a value");
      }
      options.dir = value;
      continue;
    }

    fail(`Unknown argument: ${arg}`);
  }

  return options;
}

function stripPrefix(value: string): string {
  if (value.startsWith("gh:")) return value.slice(3);
  if (value.startsWith("github:")) return value.slice(7);
  return value;
}

function normalizeTemplate(input: string): string {
  if (input.startsWith("gh:") || input.startsWith("github:")) return input;
  const [name, ref] = input.split("#");
  if (INCLUDED_TEMPLATES[name]) {
    const source = INCLUDED_TEMPLATES[name];
    return `gh:${source}${ref ? `#${ref}` : ""}`;
  }
  if (/^[^/]+\/[^/]+(\/.+)?$/.test(input)) return `gh:${input}`;
  fail(
    "Invalid template format. Use owner/repo/path, gh:owner/repo/path, or one of: astro-cloudflare-blog, tauri-cloudflare-todo",
  );
}

async function selectIncludedTemplate(): Promise<string> {
  const entries = Object.entries(INCLUDED_TEMPLATES);

  if (entries.length === 0) {
    fail("--template is required");
  }

  const input = process.stdin;
  const output = process.stdout;
  let selected = 0;
  let renderedLines = 0;

  const render = (): void => {
    if (renderedLines > 0) {
      output.write(`\x1b[${renderedLines}A`);
      output.write("\x1b[J");
    }

    const lines = [
      "Select a template (Use ↑/↓ and Enter):",
      ...entries.map(([name], index) => {
        const cursor = index === selected ? ">" : " ";
        return `  ${cursor} ${name}`;
      }),
    ];

    output.write(`${lines.join("\n")}\n`);
    renderedLines = lines.length;
  };

  return new Promise<string>((resolve, reject) => {
    const cleanup = (): void => {
      input.off("keypress", onKeypress);
      if (input.isTTY) {
        input.setRawMode(false);
      }
      input.pause();
    };

    const onKeypress = (
      _text: string,
      key: { name?: string; ctrl?: boolean },
    ): void => {
      if (key.ctrl && key.name === "c") {
        output.write("\n");
        cleanup();
        reject(new Error("Cancelled"));
        return;
      }

      if (key.name === "up") {
        selected = (selected - 1 + entries.length) % entries.length;
        render();
        return;
      }

      if (key.name === "down") {
        selected = (selected + 1) % entries.length;
        render();
        return;
      }

      if (key.name === "return" || key.name === "enter") {
        output.write("\n");
        const [name] = entries[selected];
        cleanup();
        resolve(name);
      }
    };

    emitKeypressEvents(input);
    if (input.isTTY) {
      input.setRawMode(true);
    }
    input.resume();
    input.on("keypress", onKeypress);
    render();
  });
}

async function promptOutputDirectory(defaultDir: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await rl.question(
    `Output directory (default: ${defaultDir}): `,
  );
  rl.close();

  const value = answer.trim();
  return value || defaultDir;
}

function defaultDirectory(template: string): string {
  const clean = stripPrefix(template).split("#")[0];
  const segments = clean.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  return last || "new-project";
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    usage();
    return;
  }

  if (options.version) {
    console.log(VERSION);
    return;
  }

  if (!options.template) {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      usage();
      fail("--template is required");
    }
    options.template = await selectIncludedTemplate();
    if (!options.dir) {
      options.dir = await promptOutputDirectory(".");
    }
  }

  const template = normalizeTemplate(options.template);
  const targetDir = options.dir || defaultDirectory(template);
  const currentDir = resolve(process.cwd());
  const destination = resolve(currentDir, targetDir);
  const isCurrentDir = destination === currentDir;

  if (!isCurrentDir && existsSync(destination) && !options.force) {
    fail(
      `Destination already exists: ${destination} (use --force to overwrite)`,
    );
  }

  if (!isCurrentDir && existsSync(destination) && options.force) {
    await rm(destination, { recursive: true, force: true });
  }

  const { downloadTemplate } = await import("giget");

  console.log(`Downloading and extracting template: ${template}`);
  console.log(`Destination: ${destination}`);

  await downloadTemplate(template, {
    dir: destination,
    force: true,
  });

  console.log("");
  console.log("Done.");
  console.log("Next steps:");
  console.log(`  cd ${targetDir}`);
  console.log("  pnpm install");
  console.log("  pnpm dev");
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
