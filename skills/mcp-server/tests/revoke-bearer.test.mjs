// revoke_bearer MCP tool: request shaping + guard rails. HOME and the API
// key are set BEFORE importing the package because client.js reads both at
// module load (~/.seldonframe/device.json, SELDONFRAME_API_KEY).
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

process.env.HOME = mkdtempSync(path.join(tmpdir(), "sf-mcp-home-"));
process.env.USERPROFILE = process.env.HOME;
delete process.env.SELDONFRAME_API_KEY;
const { TOOL_MAP } = await import("../src/tools.js");
const client = await import("../src/client.js");

const tool = TOOL_MAP.revoke_bearer;

test("revoke_bearer is registered with the documented input schema", () => {
  assert.ok(tool, "revoke_bearer must be registered");
  const props = Object.keys(tool.inputSchema.properties);
  assert.deepEqual(props.sort(), ["all", "token_id", "workspace_id"]);
});

test("revoke_bearer without a workspace or credentials fails with a clear error", async () => {
  await assert.rejects(() => tool.handler({}), /No workspace to revoke tokens for/);
  await assert.rejects(
    () => tool.handler({ workspace_id: "ws_1" }),
    /No local bearer for workspace ws_1 and no SELDONFRAME_API_KEY/,
  );
});

test("revoke_bearer { all: true } needs an API key (a bearer cannot lock itself out)", async () => {
  client.rememberWorkspace({ workspace_id: "ws_1", bearer_token: "wst_test", make_default: true });
  await assert.rejects(
    () => tool.handler({ workspace_id: "ws_1", all: true }),
    /requires SELDONFRAME_API_KEY/,
  );
});

test("revoke_bearer POSTs the per-workspace endpoint with the right mode and clears a self-revoked bearer", async () => {
  client.rememberWorkspace({ workspace_id: "ws_2", bearer_token: "wst_self", make_default: true });
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(init.body), auth: init.headers.Authorization });
    return new Response(
      JSON.stringify({ ok: true, revoked_count: 1, revoked_token_ids: ["t1"], caller_still_valid: false }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  try {
    const out = await tool.handler({ workspace_id: "ws_2", token_id: "t1" });
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/workspace\/ws_2\/revoke-bearer$/);
    assert.deepEqual(calls[0].body, { token_id: "t1" });
    assert.equal(calls[0].auth, "Bearer wst_self");
    assert.equal(out.device_cleared, true);
    assert.ok(!client.getWorkspaceBearer("ws_2"), "revoked local bearer must be forgotten");

    client.rememberWorkspace({ workspace_id: "ws_3", bearer_token: "wst_keep", make_default: false });
    await tool.handler({ workspace_id: "ws_3" });
    assert.deepEqual(calls[1].body, { all_except_current: true }, "default mode is all_except_current");
  } finally {
    globalThis.fetch = realFetch;
  }
});
