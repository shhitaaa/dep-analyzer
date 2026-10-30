import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import * as path from "path";
import { app } from "../app";

describe("analyze routes", () => {
    beforeAll(() => {
    process.env.ALLOW_LOCAL_SOURCES = "true";
  });
  const fixturePath = path.join(__dirname, "..", "..", "..", "core", "test-fixture", "src");
  const localSource = { type: "local", path: fixturePath.replace(/\\/g, "/") };

  it("GET /health returns ok", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("POST /analyze/blast-radius returns affected files", async () => {
    const response = await request(app)
      .post("/analyze/blast-radius")
      .send({
        source: localSource,
        startId: "constants.ts",
      });

    expect(response.status).toBe(200);
    expect(response.body.affected).toContain("math.ts");
    expect(response.body.affected).toContain("app.ts");
  });

  it("POST /analyze/blast-radius returns 400 when startId is missing", async () => {
    const response = await request(app)
      .post("/analyze/blast-radius")
      .send({ source: localSource });

    expect(response.status).toBe(400);
  });

  it("POST /analyze/blast-radius/summary returns affected files and a mock summary", async () => {
    const response = await request(app)
      .post("/analyze/blast-radius/summary")
      .send({
        source: localSource,
        startId: "constants.ts",
      });

    expect(response.status).toBe(200);
    expect(response.body.summary).toContain("[MOCK RESPONSE]");
  });

  it("POST /analyze/cycles returns SCCs including the known cycle", async () => {
    const response = await request(app)
      .post("/analyze/cycles")
      .send({ source: localSource });

    expect(response.status).toBe(200);
    const cycleNames = response.body.cycles
      .map((scc: string[]) => [...scc].sort())
      .find((names: string[]) => names.length === 2);

    expect(cycleNames).toEqual(["cyclicA.ts", "cyclicB.ts"]);
  });

  it("POST /analyze/cycles/fix-suggestion returns a mock suggestion", async () => {
    const response = await request(app)
      .post("/analyze/cycles/fix-suggestion")
      .send({
        source: localSource,
        cycle: ["cyclicA.ts", "cyclicB.ts"],
      });

    expect(response.status).toBe(200);
    expect(response.body.suggestion).toContain("[MOCK RESPONSE]");
  });

  it("POST /analyze/cycles/fix-suggestion returns 400 when cycle is missing", async () => {
    const response = await request(app)
      .post("/analyze/cycles/fix-suggestion")
      .send({ source: localSource });

    expect(response.status).toBe(400);
  });

  it("POST /analyze/dead-code returns an array", async () => {
    const response = await request(app)
      .post("/analyze/dead-code")
      .send({ source: localSource });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.deadCode)).toBe(true);
  });

  it("POST /analyze/topological-sort returns an ordering", async () => {
    const response = await request(app)
      .post("/analyze/topological-sort")
      .send({ source: localSource });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.order)).toBe(true);
    expect(response.body.order.length).toBeGreaterThan(0);
  });

  it("POST /analyze/pr-risk-score returns a mock risk assessment", async () => {
    const response = await request(app)
      .post("/analyze/pr-risk-score")
      .send({
        source: localSource,
        changedIds: ["math.ts"],
      });

    expect(response.status).toBe(200);
    expect(response.body.riskAssessment).toContain("[MOCK RESPONSE]");
  });

  it("POST /analyze/pr-risk-score returns 400 when changedIds is missing", async () => {
    const response = await request(app)
      .post("/analyze/pr-risk-score")
      .send({ source: localSource });

    expect(response.status).toBe(400);
  });

    it("blast-radius returns relative paths only, never absolute ones", async () => {
    const response = await request(app)
      .post("/analyze/blast-radius")
      .send({ source: localSource, startId: "constants.ts" });

    expect(response.status).toBe(200);
    expect(response.body.affected.length).toBeGreaterThan(0);
    for (const file of response.body.affected) {
      expect(file).not.toMatch(/^([A-Za-z]:)?[\\/]/); // no "/..." or "C:\..." paths
    }
  });

  it("blast-radius reports a clear error for a file that doesn't exist", async () => {
    const response = await request(app)
      .post("/analyze/blast-radius")
      .send({ source: localSource, startId: "does-not-exist.ts" });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body.error).toMatch(/No file found matching relative path/);
    expect(response.body.affected).toBeUndefined();
  });

  it("blast-radius does not accept an absolute path as startId", async () => {
    const absoluteId = path.join(fixturePath, "constants.ts").replace(/\\/g, "/");
    const response = await request(app)
      .post("/analyze/blast-radius")
      .send({ source: localSource, startId: absoluteId });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body.error).toMatch(/No file found matching relative path/);
  });

  it("blast-radius/summary returns a non-empty affected list for a valid file", async () => {
    const response = await request(app)
      .post("/analyze/blast-radius/summary")
      .send({ source: localSource, startId: "constants.ts" });

    expect(response.status).toBe(200);
    expect(response.body.affected).toContain("math.ts");
    expect(response.body.affected).toContain("app.ts");
    expect(response.body.summary).toBeTruthy();
  });

  it("blast-radius/summary reports a clear error for a file that doesn't exist", async () => {
    const response = await request(app)
      .post("/analyze/blast-radius/summary")
      .send({ source: localSource, startId: "does-not-exist.ts" });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body.error).toMatch(/No file found matching relative path/);
  });
});