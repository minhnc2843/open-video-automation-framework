import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("render CLI", () => {
  it("fails clearly when the input JSON Script does not exist", () => {
    const result = spawnSync(process.execPath, ["scripts/render.mjs", "examples/does-not-exist.json"], {
      cwd: process.cwd(),
      encoding: "utf8"
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Input JSON Script does not exist");
  });
});
