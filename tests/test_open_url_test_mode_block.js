import assert from "node:assert/strict";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";

const originalExec = childProcess.exec;
let execCalls = 0;
childProcess.exec = (command, callback) => {
    execCalls++;
    callback(null, { stdout: "", stderr: "" });
    return { command };
};
syncBuiltinESMExports();

try {
    const { executeOpenUrl } = await import("../src/core/actions/openUrl.js?open-url-contract");
    process.env.SP4_TEST = "true";
    const blocked = await executeOpenUrl({ url: "https://example.invalid" }, { persona: "core" });
    assert.equal(blocked.success, false);
    assert.equal(blocked.skipped, true);
    assert.equal(blocked.reason, "disabled_in_test_mode");
    assert.equal(execCalls, 0, "test mode reached child_process.exec");

    delete process.env.SP4_TEST;
    const productionPath = await executeOpenUrl({ url: "https://example.invalid" }, { persona: "core" });
    assert.equal(productionPath.success, true);
    assert.equal(execCalls, 1, "production path no longer delegates to exec");
} finally {
    childProcess.exec = originalExec;
    syncBuiltinESMExports();
    delete process.env.SP4_TEST;
}

console.log("PASS: OPEN_URL is physically blocked in SP4_TEST and production keeps the exec path");
