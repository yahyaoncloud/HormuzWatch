import { execSync } from "node:child_process";

try {
  execSync("react-router build", { stdio: "inherit" });
  process.exit(0);
} catch (_error) {
  process.exit(1);
}
