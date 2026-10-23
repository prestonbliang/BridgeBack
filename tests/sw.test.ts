import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import { describe, expect, it } from "vitest";

const worker = readFileSync(
  new URL("../service-worker/worker.js", import.meta.url),
  "utf8",
);
const origin = "https://bridgeback.test";
const key = (input: string | Request) =>
  new URL(typeof input === "string" ? input : input.url, origin).href;

type WorkerEvent = {
  request: { method: string; url: string; mode: string };
  waitUntil: (promise: Promise<unknown>) => void;
  respondWith: (promise: Promise<Response>) => void;
};

function harness() {
  let html = '<html><script src="/_next/static/app-a.js"></script></html>';
  let brokenAsset = false;
  let brokenPolicy = false;
  let claimed = false;
  const network = async (input: string | Request) => {
    const url = key(input);
    if (url === origin + "/") return new Response(html);
    if (url === origin + "/notices")
      return new Response("Open-source acknowledgments");
    if (url === origin + "/privacy")
      return brokenPolicy
        ? new Response("Policy unavailable", { status: 503 })
        : new Response(
            '<html>Privacy policy<script src="/_next/static/privacy.js"></script></html>',
          );
    if (brokenAsset && new URL(url).pathname.endsWith(".js"))
      return new Response("failure", { status: 503 });
    return new Response("asset");
  };
  class MemoryCache {
    entries = new Map<string, Response>();
    async match(input: string | Request) {
      return this.entries.get(key(input))?.clone();
    }
    async put(input: string | Request, value: Response) {
      this.entries.set(key(input), value.clone());
    }
    async delete(input: string | Request) {
      return this.entries.delete(key(input));
    }
    async addAll(inputs: string[]) {
      const pairs = await Promise.all(
        inputs.map(async (input) => {
          const value = await network(input);
          if (!value.ok) throw Error("Asset unavailable");
          return [input, value] as const;
        }),
      );
      for (const [input, value] of pairs) await this.put(input, value);
    }
  }
  const stores = new Map<string, MemoryCache>();
  const caches = {
    keys: async () => [...stores.keys()],
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new MemoryCache());
      return stores.get(name)!;
    },
    delete: async (name: string) => stores.delete(name),
  };
  const handlers = new Map<string, (event: WorkerEvent) => void>();
  runInNewContext(worker, {
    caches,
    fetch: network,
    crypto: webcrypto,
    TextEncoder,
    Uint8Array,
    Response,
    URL,
    self: {
      location: { origin },
      clients: {
        claim: async () => {
          claimed = true;
        },
      },
      addEventListener: (type: string, handler: (event: WorkerEvent) => void) =>
        handlers.set(type, handler),
    },
  });
  const dispatch = async (type: string, path = "/", mode = "navigate") => {
    const waits: Promise<unknown>[] = [];
    let response: Promise<Response> | undefined;
    handlers.get(type)!({
      request: { method: "GET", url: new URL(path, origin).href, mode },
      waitUntil: (promise) => {
        waits.push(promise);
      },
      respondWith: (promise) => {
        response = promise;
      },
    });
    const result = response && (await response);
    await Promise.all(waits);
    return result;
  };
  return {
    stores,
    caches,
    dispatch,
    setHtml: (value: string) => {
      html = value;
    },
    failAssets: () => {
      brokenAsset = true;
    },
    failPolicy: () => {
      brokenPolicy = true;
    },
    claimed: () => claimed,
  };
}

describe("atomic offline shell lifecycle", () => {
  it("preserves deployment-tagged URLs and never serves one deployment's chunk as another", async () => {
    const app = harness();
    app.setHtml(
      '<html><script src="/_next/static/app-a.js?dpl=deployment-a&amp;v=1"></script></html>',
    );
    await app.dispatch("install");
    await app.dispatch("activate");
    app.failAssets();
    expect(
      await (
        await app.dispatch(
          "fetch",
          "/_next/static/app-a.js?dpl=deployment-a&v=1",
          "cors",
        )
      )?.text(),
    ).toBe("asset");
    expect(
      (
        await app.dispatch(
          "fetch",
          "/_next/static/app-a.js?dpl=deployment-b&v=1",
          "cors",
        )
      )?.status,
    ).toBe(503);
  });
  it("activates only a fully cached shell and preserves unrelated origin caches", async () => {
    const app = harness();
    await app.caches.open("unrelated-app-cache");
    await app.caches.open("bridgeback-shell-v1");
    await app.dispatch("install");
    expect(app.claimed()).toBe(false);
    await app.dispatch("activate");
    expect(app.claimed()).toBe(true);
    expect(app.stores.has("unrelated-app-cache")).toBe(true);
    expect(app.stores.has("bridgeback-shell-v1")).toBe(false);
    expect(await (await app.dispatch("fetch"))?.text()).toContain("app-a.js");
  });
  it("retains its matching HTML instead of replacing it with an uncached new build", async () => {
    const app = harness();
    await app.dispatch("install");
    await app.dispatch("activate");
    app.setHtml('<html><script src="/_next/static/app-b.js"></script></html>');
    expect(await (await app.dispatch("fetch"))?.text()).toContain("app-a.js");
  });
  it("a failed candidate install leaves the current shell and unrelated caches intact", async () => {
    const app = harness();
    await app.dispatch("install");
    await app.dispatch("activate");
    const original = [...app.stores.keys()].sort();
    app.setHtml('<html><script src="/_next/static/broken.js"></script></html>');
    app.failAssets();
    await expect(app.dispatch("install")).rejects.toThrow("Asset unavailable");
    expect([...app.stores.keys()].sort()).toEqual(original);
    expect(await (await app.dispatch("fetch"))?.text()).toContain("app-a.js");
  });
  it("does not intercept external websites or arbitrary application requests", async () => {
    const app = harness();
    expect(
      await app.dispatch("fetch", "https://provider.example/", "navigate"),
    ).toBeUndefined();
    expect(await app.dispatch("fetch", "/private-api", "cors")).toBeUndefined();
  });
  it("ships the privacy page and its matching script for offline reading", async () => {
    const app = harness();
    await app.dispatch("install");
    await app.dispatch("activate");
    app.failPolicy();
    expect(
      await (await app.dispatch("fetch", "/privacy", "navigate"))?.text(),
    ).toContain("Privacy policy");
    expect(
      await (await app.dispatch("fetch", "/notices", "navigate"))?.text(),
    ).toContain("Open-source acknowledgments");
    expect(
      await app.dispatch("fetch", "/_next/static/privacy.js", "cors"),
    ).toBeDefined();
  });
  it("keeps the active shell when its replacement cannot include the privacy page", async () => {
    const app = harness();
    await app.dispatch("install");
    await app.dispatch("activate");
    const original = [...app.stores.keys()].sort();
    app.setHtml('<html><script src="/_next/static/app-b.js"></script></html>');
    app.failPolicy();
    await expect(app.dispatch("install")).rejects.toThrow(
      "Privacy policy unavailable",
    );
    expect([...app.stores.keys()].sort()).toEqual(original);
    expect(await (await app.dispatch("fetch"))?.text()).toContain("app-a.js");
  });
});
