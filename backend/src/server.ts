import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectMongo } from "./config/mongodb.js";

async function start() {
  await connectMongo();

  app.listen(env.port, "0.0.0.0", () => {
    console.log(`API running on http://0.0.0.0:${env.port}`);
  });
}

start().catch((error) => {
  console.error("Could not start backend", error);
  process.exit(1);
});
