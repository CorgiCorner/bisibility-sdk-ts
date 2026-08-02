import { describe, expect, it, vi } from "vitest";
import {
  BISIBILITY_API_VERSION,
  BISIBILITY_API_VERSION_HEADER,
  BisibilityApiVersionError,
  BisibilityClient,
} from "../src/index.js";

const apiKey = "bsb_key_test_x";
const baseUrl = "https://api.test/api/v1";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      ...Object.fromEntries(new Headers(init.headers)),
    },
    status: init.status ?? 200,
  });
}

function projectsResponse() {
  return { data: [], meta: { next_cursor: null } };
}

function client(fetch: typeof globalThis.fetch) {
  return new BisibilityClient({ apiKey, baseUrl, fetch });
}

describe("API version declaration and preflight", () => {
  it("preflights once and preserves behavior against a matching server", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      expect(headers.get(BISIBILITY_API_VERSION_HEADER)).toBe(BISIBILITY_API_VERSION);

      return url.endsWith("/capabilities")
        ? jsonResponse({ apiVersions: [BISIBILITY_API_VERSION], data: [] })
        : jsonResponse(projectsResponse());
    });
    const sdk = client(fetchMock);

    await expect(sdk.listProjects()).resolves.toEqual(projectsResponse());
    await expect(sdk.listProjects()).resolves.toEqual(projectsResponse());

    expect(fetchMock.mock.calls.map((call) => String(call[0]))).toEqual([
      `${baseUrl}/capabilities`,
      `${baseUrl}/projects`,
      `${baseUrl}/projects`,
    ]);
  });

  it("throws a branchable error when the server does not serve the client version", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        {
          detail: "The declared API version v1 is not served by this server.",
          docs_url: "https://bisibility.com/docs/api/errors#unsupported_api_version",
          errors: {
            apiVersions: ["v2"],
            declaredApiVersion: BISIBILITY_API_VERSION,
          },
          instance: "urn:bisibility:api:v1:/api/v1/capabilities",
          status: 409,
          title: "Unsupported API version",
          type: "https://bisibility.com/problems/unsupported_api_version",
        },
        { status: 409 },
      ),
    );

    const error = await client(fetchMock)
      .listProjects()
      .then(
        () => undefined,
        (cause: unknown) => cause,
      );
    expect(error).toBeInstanceOf(BisibilityApiVersionError);
    expect(error).toMatchObject({
      declaredApiVersion: BISIBILITY_API_VERSION,
      serverApiVersions: ["v2"],
      status: 409,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("continues unchanged when an older server advertises no API versions", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(new Headers(init?.headers).get(BISIBILITY_API_VERSION_HEADER)).toBe(
        BISIBILITY_API_VERSION,
      );
      return String(input).endsWith("/capabilities")
        ? jsonResponse({ data: [] })
        : jsonResponse(projectsResponse());
    });

    await expect(client(fetchMock).listProjects()).resolves.toEqual(projectsResponse());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses an explicit capabilities call as the client's preflight", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) =>
      String(input).endsWith("/capabilities")
        ? jsonResponse({ apiVersions: [BISIBILITY_API_VERSION], data: [] })
        : jsonResponse(projectsResponse()),
    );
    const sdk = client(fetchMock);

    await expect(sdk.getCapabilities()).resolves.toEqual({
      apiVersions: [BISIBILITY_API_VERSION],
      data: [],
    });
    await expect(sdk.listProjects()).resolves.toEqual(projectsResponse());

    expect(fetchMock.mock.calls.map((call) => String(call[0]))).toEqual([
      `${baseUrl}/capabilities`,
      `${baseUrl}/projects`,
    ]);
  });
});
