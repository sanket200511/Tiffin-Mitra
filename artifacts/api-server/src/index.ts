import "./env";
import app from "./app";
import { logger } from "./lib/logger";
import { initTasks } from "./lib/tasks";
import { initRenderKeepAlive } from "./lib/render-keep-alive";

initTasks();
initRenderKeepAlive();

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, "0.0.0.0", () => {
  logger.info({ port, host: "0.0.0.0" }, "Server listening");
});
