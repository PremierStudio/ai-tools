import { run } from "./index.js";

run(process.argv.slice(2)).catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
