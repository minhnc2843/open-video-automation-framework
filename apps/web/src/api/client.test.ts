import { describe, expect, it } from "vitest";
import { createApiClient, normalizeBaseUrl, type ApiFetch } from "./client";

describe("web API client", () => {
  it("normalizes API base URLs", () => {
    expect(normalizeBaseUrl("http://localhost:3000/")).toBe("http://localhost:3000");
    expect(normalizeBaseUrl(" / ")).toBe("");
    expect(normalizeBaseUrl("")).toBe("");
  });

  it("posts typed JSON payloads to the API", async () => {
    const calls: { readonly input: string; readonly init: RequestInit | undefined }[] = [];
    const fetcher: ApiFetch = async (input, init) => {
      calls.push({ input, init });
      return {
        json: async () => ({
          ok: true,
          data: {
            createdAt: "2026-06-24T00:00:00.000Z",
            id: "project-1",
            language: "vi",
            name: "Example",
            updatedAt: "2026-06-24T00:00:00.000Z",
            workspaceId: "workspace-1"
          }
        })
      };
    };
    const client = createApiClient({ baseUrl: "http://localhost:3000/", fetcher });

    const response = await client.createProject({
      id: "project-1",
      language: "vi",
      name: "Example",
      workspaceId: "workspace-1"
    });

    expect(response.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("http://localhost:3000/projects");
    expect(calls[0]?.init?.method).toBe("POST");
    expect((calls[0]?.init?.headers as Headers).get("content-type")).toBe("application/json");
    expect(calls[0]?.init?.body).toBe(
      JSON.stringify({
        id: "project-1",
        language: "vi",
        name: "Example",
        workspaceId: "workspace-1"
      })
    );
  });

  it("encodes route parameters", async () => {
    const calls: string[] = [];
    const fetcher: ApiFetch = async (input) => {
      calls.push(input);
      return {
        json: async () => ({
          ok: false,
          error: {
            code: "API-NOTFOUND-001",
            humanReadableMessage: "Project was not found."
          }
        })
      };
    };
    const client = createApiClient({ baseUrl: "", fetcher });

    await client.getProject("project with spaces");

    expect(calls).toEqual(["/projects/project%20with%20spaces"]);
  });
});
