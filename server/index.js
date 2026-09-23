import "dotenv/config";
import { createApp } from "./app.js";
const port = Number(process.env.PORT) || 3001;
const server = createApp().listen(port, "127.0.0.1", () =>
  console.log(`Haven House ready at http://127.0.0.1:${port}`),
);
process.on("SIGTERM", () => server.close());
