import assert from 'node:assert';
import { applyPostImmuneResponseControl, getImmuneRetryDirective } from '../src/runtime/responseControl.js';

function simulateResponseControlFlow({ userInput, initialResponse, initialVerdict, retryResponse, retryVerdict, truthAnchorAvailable = false }) {
    let responseText = initialResponse;
    let immuneVerdict = initialVerdict;

    const metadata = {
        retryApplied: false,
        retryImproved: false,
    };

    const retryDirective = getImmuneRetryDirective({
        immuneVerdict,
        retryApplied: metadata.retryApplied,
        truthAnchorAvailable,
    });

    const softRetrySafe =
        retryDirective.shouldRetry &&
        immuneVerdict.immune_confidence === 'high' &&
        typeof responseText === 'string' &&
        responseText.trim().length > 0 &&
        (retryDirective.strategy !== 'answer_again' || truthAnchorAvailable === true);

    if (softRetrySafe && retryVerdict && typeof retryResponse === 'string' && retryResponse.trim()) {
        const retryImproved =
            retryVerdict.severity !== 'hard' &&
            (retryVerdict.pass === true || retryVerdict.severity === 'none');

        metadata.retryApplied = true;
        metadata.retryImproved = retryImproved;

        if (retryImproved) {
            responseText = retryResponse;
            immuneVerdict = retryVerdict;
        }
    }

    const responseControlDecision = applyPostImmuneResponseControl({
        immuneVerdict,
        retryApplied: metadata.retryApplied,
        retryImproved: metadata.retryImproved,
        userInput,
        responseText,
    });

    if (responseControlDecision.responseControlApplied) {
        responseText = responseControlDecision.replacementText;
    }

    return {
        responseText,
        immuneVerdict,
        metadata,
        retryDirective,
        responseControlDecision,
    };
}

const lowConfidenceTerminal = simulateResponseControlFlow({
    userInput: 'Ako funguje SP4 memory?',
    initialResponse: 'SP4 používa vrstvy pamäte, ale odpoveď je neistá.',
    initialVerdict: {
        severity: 'soft',
        pass: false,
        immune_confidence: 'high',
        reason_codes: ['RELEVANCE_LOW_CONFIDENCE'],
    },
    retryResponse: 'SP4 má raw log, chapters a seeds.',
    retryVerdict: {
        severity: 'soft',
        pass: false,
        immune_confidence: 'high',
        reason_codes: ['RELEVANCE_LOW_CONFIDENCE'],
    },
    truthAnchorAvailable: false,
});

assert.equal(lowConfidenceTerminal.metadata.retryApplied, false, 'low-confidence path without truth anchor must not retry');
assert.equal(lowConfidenceTerminal.metadata.retryImproved, false, 'low-confidence non-retry path must keep retryImproved false');
assert.equal(lowConfidenceTerminal.responseControlDecision.responseControlApplied, false, 'terminal low-confidence should remain retry-only in integrated flow');
assert.equal(lowConfidenceTerminal.responseControlDecision.action, 'RETRY_ONLY_LOW_CONFIDENCE', 'terminal low-confidence should keep retry-only action');

const zeroOverlapTerminal = simulateResponseControlFlow({
    userInput: 'Ako funguje SP4 memory?',
    initialResponse: 'Poďme hovoriť o počasí.',
    initialVerdict: {
        severity: 'soft',
        pass: false,
        immune_confidence: 'high',
        reason_codes: ['RELEVANCE_ZERO_OVERLAP'],
    },
    retryResponse: 'Stále odpovedám mimo témy.',
    retryVerdict: {
        severity: 'soft',
        pass: false,
        immune_confidence: 'high',
        reason_codes: ['RELEVANCE_ZERO_OVERLAP'],
    },
    truthAnchorAvailable: false,
});

assert.equal(zeroOverlapTerminal.metadata.retryApplied, false, 'zero-overlap path without truth anchor must not retry');
assert.equal(zeroOverlapTerminal.metadata.retryImproved, false, 'zero-overlap non-retry path must keep retryImproved false');
assert.equal(zeroOverlapTerminal.responseControlDecision.responseControlApplied, true, 'terminal zero-overlap should still trigger safe rewrite in integrated flow');
assert.equal(zeroOverlapTerminal.responseControlDecision.responseControlReason, 'RELEVANCE_ZERO_OVERLAP', 'zero-overlap safe rewrite reason should remain unchanged');

const zeroOverlapAnchoredImproved = simulateResponseControlFlow({
    userInput: 'Čo je SP4 manifest?',
    initialResponse: 'Poďme hovoriť o počasí.',
    initialVerdict: {
        severity: 'soft',
        pass: false,
        immune_confidence: 'high',
        reason_codes: ['RELEVANCE_ZERO_OVERLAP'],
    },
    retryResponse: 'SP4 manifest stavia na slobode, súkromí, lokálnosti a tvorbe namiesto korporátnej závislosti.',
    retryVerdict: {
        severity: 'none',
        pass: true,
        immune_confidence: 'high',
        reason_codes: [],
        relevance_ok: true,
    },
    truthAnchorAvailable: true,
});

assert.equal(zeroOverlapAnchoredImproved.metadata.retryApplied, true, 'anchored zero-overlap path should record retry attempt');
assert.equal(zeroOverlapAnchoredImproved.metadata.retryImproved, true, 'anchored zero-overlap retry should accept improved verdict');
assert.equal(zeroOverlapAnchoredImproved.responseControlDecision.responseControlApplied, false, 'improved anchored zero-overlap should avoid safe rewrite');
assert.equal(zeroOverlapAnchoredImproved.responseText, 'SP4 manifest stavia na slobode, súkromí, lokálnosti a tvorbe namiesto korporátnej závislosti.', 'anchored zero-overlap retry should keep improved retry text');

const improvedRetryFlow = simulateResponseControlFlow({
    userInput: 'Ako funguje SP4 memory?',
    initialResponse: 'This drifted into English.',
    initialVerdict: {
        severity: 'soft',
        pass: false,
        immune_confidence: 'high',
        reason_codes: ['LANG_HEAVY_EN'],
    },
    retryResponse: 'SP4 pamäť funguje vo vrstvách: raw log, chapters a seeds.',
    retryVerdict: {
        severity: 'none',
        pass: true,
        immune_confidence: 'high',
        reason_codes: [],
    },
    truthAnchorAvailable: false,
});

assert.equal(improvedRetryFlow.metadata.retryApplied, true, 'improved retry path should record retry attempt');
assert.equal(improvedRetryFlow.metadata.retryImproved, true, 'improved retry path should accept passing retry verdict');
assert.equal(improvedRetryFlow.responseText, 'SP4 pamäť funguje vo vrstvách: raw log, chapters a seeds.', 'improved retry path should keep repaired response');
assert.equal(improvedRetryFlow.responseControlDecision.responseControlApplied, false, 'improved retry path should not fall into safe rewrite');

console.log('PASS: response control flow smoke');