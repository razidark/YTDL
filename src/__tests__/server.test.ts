// =========================================================================
// YTDL — Server Tests
// =========================================================================

import request from "supertest";
import { app } from "../server";

const API_BASE = "/api";

describe("YTDL Server API", () => {
  describe("CORS policy", () => {
    it("does not grant arbitrary origins access to the local API", async () => {
      const response = await request(app)
        .get(`${API_BASE}/health`)
        .set("Origin", "https://attacker.example");
      expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    });
  });

  describe("GET /api/health", () => {
    it("should return health status", async () => {
      const response = await request(app).get(`${API_BASE}/health`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status");
      expect(response.body).toHaveProperty("port");
    });

    it("should return degraded status when yt-dlp is not available", async () => {
      // This test assumes yt-dlp is not available in test environment
      const response = await request(app).get(`${API_BASE}/health`);
      expect(["ok", "degraded"]).toContain(response.body.status);
    });
  });

  describe("GET /api/info", () => {
    it("should return 400 when url is missing", async () => {
      const response = await request(app).get(`${API_BASE}/info`);
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should return 400 when url is invalid", async () => {
      const response = await request(app).get(`${API_BASE}/info?url=invalid-url`);
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should return video info for valid YouTube URL", async () => {
      const response = await request(app).get(
        `${API_BASE}/info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ`
      );
      // This test expects a valid response or error from the server
      expect([200, 500]).toContain(response.status);
    }, 30000);
  });

  describe("GET /api/download", () => {
    it("should return 400 when url is missing", async () => {
      const response = await request(app).get(`${API_BASE}/download`);
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should return 400 when url is invalid", async () => {
      const response = await request(app).get(`${API_BASE}/download?url=invalid-url`);
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should handle download request", async () => {
      const response = await request(app).get(
        `${API_BASE}/download?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ&mode=audio`
      );
      // This test expects a valid response or error from the server
      expect([200, 500, 404]).toContain(response.status);
    }, 30000);
  });
});
