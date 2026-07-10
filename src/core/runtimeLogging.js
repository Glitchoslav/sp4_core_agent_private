export function isRuntimeLoggingEnabled() {
    return process.env.SP4_VERBOSE === '1' || process.env.SP4_DEBUG === 'true';
}

export function getRuntimeLoggingState() {
    return {
        enabled: isRuntimeLoggingEnabled(),
        verbose: process.env.SP4_VERBOSE === '1',
        debug: process.env.SP4_DEBUG === 'true'
    };
}

export function setRuntimeLoggingEnabled(enabled) {
    if (enabled) {
        process.env.SP4_VERBOSE = '1';
        process.env.SP4_DEBUG = 'true';
    } else {
        process.env.SP4_VERBOSE = '0';
        process.env.SP4_DEBUG = 'false';
    }

    return getRuntimeLoggingState();
}

export function toggleRuntimeLogging() {
    return setRuntimeLoggingEnabled(!isRuntimeLoggingEnabled());
}

export function runtimeLog(...args) {
    if (isRuntimeLoggingEnabled()) {
        console.log(...args);
    }
}

export function runtimeWarn(...args) {
    if (isRuntimeLoggingEnabled()) {
        console.warn(...args);
    }
}

export function runtimeDebug(...args) {
    if (process.env.SP4_DEBUG === 'true') {
        console.log(...args);
    }
}
