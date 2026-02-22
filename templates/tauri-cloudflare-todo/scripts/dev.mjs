import { spawn, spawnSync } from "node:child_process";
import net from "node:net";

const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const backendPort = Number(process.env.BACKEND_PORT || "8787");
const frontendPort = Number(process.env.FRONTEND_PORT || "1420");
const healthUrl = process.env.BACKEND_HEALTH_URL || `http://127.0.0.1:${backendPort}/api/health`;
const healthTimeoutMs = 90_000;
const pollIntervalMs = 1_000;
const requestTimeoutMs = 2_000;

let backend = null;
let app = null;
let shuttingDown = false;

function runPnpm(args, extraEnv = {}) {
  return spawn(pnpmCmd, args, {
    stdio: "inherit",
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...extraEnv,
    },
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function listListeningPids(port) {
  if (process.platform === "win32") {
    return [];
  }

  const result = spawnSync("lsof", ["-nP", `-tiTCP:${port}`, "-sTCP:LISTEN"], {
    encoding: "utf8",
  });

  if (result.error) {
    console.warn(`[dev] Failed to run lsof for port ${port}: ${result.error.message}`);
    return [];
  }

  return [...new Set(
    result.stdout
      .split(/\r?\n/)
      .map((line) => Number(line.trim()))
      .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid),
  )];
}

async function freePort(port) {
  const pids = listListeningPids(port);
  if (pids.length === 0) return;

  console.log(`[dev] Releasing port ${port} by stopping PID(s): ${pids.join(", ")}`);
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Ignore races.
    }
  }

  await sleep(1_000);

  const alive = pids.filter((pid) => isProcessAlive(pid));
  if (alive.length > 0) {
    console.log(`[dev] Forcing stop for PID(s): ${alive.join(", ")}`);
    for (const pid of alive) {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // Ignore races.
      }
    }
    await sleep(300);
  }
}

function canListen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
  });
}

async function waitForHealth() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < healthTimeoutMs) {
    if (!backend || backend.exitCode !== null) {
      throw new Error("Backend process exited before it became healthy.");
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
      const res = await fetch(healthUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) return;
    } catch {
      // Keep polling.
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Backend health check timed out: ${healthUrl}`);
}

function terminateChild(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  setTimeout(() => {
    if (child.exitCode === null) {
      child.kill("SIGKILL");
    }
  }, 3_000);
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  terminateChild(app);
  terminateChild(backend);
  process.exit(code);
}

process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));

async function main() {
  if (!Number.isInteger(backendPort) || backendPort <= 0 || backendPort > 65535) {
    throw new Error(`Invalid BACKEND_PORT: ${backendPort}`);
  }
  if (!Number.isInteger(frontendPort) || frontendPort <= 0 || frontendPort > 65535) {
    throw new Error(`Invalid FRONTEND_PORT: ${frontendPort}`);
  }

  await freePort(backendPort);

  const portAvailable = await canListen(backendPort);
  if (!portAvailable) {
    throw new Error(
      `Port ${backendPort} is already in use and could not be released.`,
    );
  }

  backend = runPnpm(["--filter", "backend", "dev"]);

  backend.on("exit", (code) => {
    if (!shuttingDown) {
      shutdown(code ?? 1);
    }
  });

  console.log(`[dev] Waiting for backend health: ${healthUrl}`);
  await waitForHealth();
  console.log("[dev] Backend is healthy. Starting Tauri app...");

  await freePort(frontendPort);

  const frontendPortAvailable = await canListen(frontendPort);
  if (!frontendPortAvailable) {
    throw new Error(`Port ${frontendPort} is already in use and could not be released.`);
  }

  app = runPnpm(["--filter", "app", "tauri:dev"], {
    VITE_API_BASE_URL: `http://127.0.0.1:${backendPort}`,
  });
  app.on("exit", (code) => {
    if (!shuttingDown) {
      shutdown(code ?? 0);
    }
  });
}

main().catch((error) => {
  console.error(`[dev] ${error instanceof Error ? error.message : String(error)}`);
  shutdown(1);
});
