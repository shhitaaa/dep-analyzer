import { describe, it, expect } from "vitest";
import request from "supertest";
import * as path from "path";
import { app } from "../app";

describe("analyze routes", () => {
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
        startId: `${localSource.path}/constants.ts`,
      });

    expect(response.status).toBe(200);
    expect(response.body.affected).toContain(`${localSource.path}/math.ts`);
    expect(response.body.affected).toContain(`${localSource.path}/app.ts`);
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
        startId: `${localSource.path}/constants.ts`,
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
      .map((scc: string[]) => scc.map((id) => path.basename(id)).sort())
      .find((names: string[]) => names.length === 2);

    expect(cycleNames).toEqual(["cyclicA.ts", "cyclicB.ts"]);
  });

  it("POST /analyze/cycles/fix-suggestion returns a mock suggestion", async () => {
    const response = await request(app)
      .post("/analyze/cycles/fix-suggestion")
      .send({
        source: localSource,
        cycle: [`${localSource.path}/cyclicA.ts`, `${localSource.path}/cyclicB.ts`],
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
        changedIds: [`${localSource.path}/math.ts`],
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
});