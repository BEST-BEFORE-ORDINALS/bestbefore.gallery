import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
);

test("MIT license exists", () => {
  assert.equal(existsSync(new URL("../LICENSE", import.meta.url)), true);
});

test("governance docs exist", () => {
  assert.equal(existsSync(new URL("../CONTRIBUTING.md", import.meta.url)), true);
  assert.equal(existsSync(new URL("../SECURITY.md", import.meta.url)), true);
  assert.equal(existsSync(new URL("../CHANGELOG.md", import.meta.url)), true);
});

test("quality scripts exist", () => {
  assert.equal(typeof packageJson.scripts?.build, "string");
  assert.equal(typeof packageJson.scripts?.test, "string");
  assert.equal(typeof packageJson.scripts?.verify, "string");
});

test("deployment baseline exists", () => {
  const hasWranglerToml = existsSync(new URL("../wrangler.toml", import.meta.url));
  const hasCloudflareTempDir = existsSync(new URL("../.wrangler", import.meta.url));
  assert.equal(hasWranglerToml || hasCloudflareTempDir, true);
});

test("core project structure exists", () => {
  assert.equal(existsSync(new URL("../src", import.meta.url)), true);
  assert.equal(existsSync(new URL("../public", import.meta.url)), true);
  assert.equal(existsSync(new URL("../index.html", import.meta.url)), true);
});
