import { describe, expect, it } from "vitest";
import { assemble } from "./assemble";
import { HttpError, send, type FetchLike } from "./send";

const req = assemble({ layer: 1, model: "m", settings: { max_tokens: 5, temperature: 0 } }, { document: "Hi" });

describe("send", () => {
  it("posts the exact body to the provider path, with the key", async () => {
    let seen: Parameters<FetchLike> | undefined;
    const fetchFn: FetchLike = async (...args) => {
      seen = args;
      return { ok: true, status: 200, text: async () => '{"choices":[{"text":" there"}]}' };
    };
    const out = await send(req, { baseUrl: "https://openrouter.ai/api/", apiKey: " sk-1 " }, fetchFn);
    expect(seen![0]).toBe("https://openrouter.ai/api/v1/completions");
    expect(seen![1].body).toBe('{"model":"m","prompt":"Hi","max_tokens":5,"temperature":0}');
    expect(seen![1].headers.authorization).toBe("Bearer sk-1");
    expect(out).toEqual({ choices: [{ text: " there" }] });
  });

  it("raises HttpError with the raw body on an error status", async () => {
    const fetchFn: FetchLike = async () => ({ ok: false, status: 401, text: async () => '{"error":"No auth"}' });
    const err = (await send(req, { baseUrl: "x" }, fetchFn).catch((e: unknown) => e)) as HttpError;
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(401);
    expect(err.body).toBe('{"error":"No auth"}');
  });

  it("treats a non-JSON success as an error, keeping the body", async () => {
    const fetchFn: FetchLike = async () => ({ ok: true, status: 200, text: async () => "<html>" });
    await expect(send(req, { baseUrl: "x" }, fetchFn)).rejects.toMatchObject({ body: "<html>" });
  });
});
