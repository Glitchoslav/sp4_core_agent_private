import assert from 'node:assert/strict';

import { SP4IntegratedAgent } from '../integration.js';

console.log('🧪 TEST: test_009 partial regression contract');

function getProvider(result) {
    return result?.metadata?.provider || result?.provider || null;
}

function getResponseText(result) {
    return String(result?.response || '').trim();
}

const agent = new SP4IntegratedAgent();
const init = await agent.initialize();

assert.equal(init?.success, true, 'agent must initialize before the regression contract runs');

await agent.processMessage('co je OSPF', 'core', { testMode: true });
const ospfFollowUp = await agent.processMessage('a kedy by si ho pouzil namiesto statickych tras?', 'core', { testMode: true });
const ospfText = getResponseText(ospfFollowUp);

assert.match(ospfText, /OSPF/i, 'OSPF follow-up must keep the original protocol subject');
assert.match(ospfText, /routing|trasy/i, 'OSPF follow-up must stay in routing context');
assert.match(ospfText, /dynam/i, 'OSPF follow-up must keep the dynamic-routing reason');

const pingTraceroute = await agent.processMessage('vysvetli rozdiel medzi ping a traceroute v dvoch vetach', 'core', { testMode: true });
const pingTracerouteText = getResponseText(pingTraceroute);
const pingTracerouteProvider = getProvider(pingTraceroute);

assert.equal(pingTracerouteProvider, 'local_ollama', 'ping vs traceroute compare must stay on the local LLM path');
assert.match(pingTracerouteText, /ping/i, 'compare answer must name ping explicitly');
assert.match(pingTracerouteText, /traceroute/i, 'compare answer must name traceroute explicitly');
assert.match(pingTracerouteText, /latenc/i, 'compare answer must mention latency');
assert.match(pingTracerouteText, /skok|hop/i, 'compare answer must mention hops/skoky');

console.log('PASS: targeted regressions for Q03 and Q07 hold');