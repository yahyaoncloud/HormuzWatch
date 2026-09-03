import { execSync } from "node:child_process";

try {
  execSync("npx react-router build", { stdio: "inherit" });
  process.exit(0);
} catch (error) {
  process.exit(1);
}
