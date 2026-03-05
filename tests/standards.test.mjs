import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
);
const expectFile = (relativePath) => {
  assert.equal(existsSync(new URL(relativePath, root)), true, `${relativePath} should exist`);
};

test("MIT license exists", () => {
  expectFile("LICENSE");
});

test("governance docs exist", () => {
  expectFile("CONTRIBUTING.md");
  expectFile("SECURITY.md");
  expectFile("CHANGELOG.md");
});

test("core repo docs exist", () => {
  expectFile("docs/ARCHITECTURE.md");
  expectFile("docs/DATA-SOURCES.md");
  expectFile("docs/DEPLOYMENT.md");
});

test("repo governance and config files exist", () => {
  expectFile(".editorconfig");
  expectFile(".nvmrc");
  expectFile(".github/CODEOWNERS");
  expectFile(".github/dependabot.yml");
  expectFile(".github/pull_request_template.md");
  expectFile("wrangler.toml");
});

test("quality scripts exist", () => {
  assert.equal(typeof packageJson.scripts?.build, "string");
  assert.equal(typeof packageJson.scripts?.test, "string");
  assert.equal(typeof packageJson.scripts?.verify, "string");
  assert.equal(typeof packageJson.engines?.node, "string");
});

test("deployment baseline exists", () => {
  const hasCiWorkflow = existsSync(
    new URL("../.github/workflows/ci.yml", import.meta.url)
  );
  const hasBuildScript = typeof packageJson.scripts?.build === "string";
  const hasPreviewScript = typeof packageJson.scripts?.preview === "string";
  const hasPagesConfig = existsSync(new URL("../wrangler.toml", import.meta.url));
  assert.equal(hasCiWorkflow && hasBuildScript && hasPreviewScript && hasPagesConfig, true);
});

test("core project structure exists", () => {
  expectFile("src");
  expectFile("public");
  expectFile("index.html");
});
