function isObject(value) {
  return value !== null && typeof value === 'object';
}

function applyPatch(target, patch) {
  if (!isObject(target) || !isObject(patch) || Object.keys(patch).length === 0) {
    return target;
  }
  Object.assign(target, patch);
  return target;
}

export function patchResultMetadata(result, patch = {}) {
  if (!isObject(result) || !isObject(patch) || Object.keys(patch).length === 0) {
    return result;
  }

  if (result.metadata) {
    applyPatch(result.metadata, patch);
  }

  if (result.meta && result.meta !== result.metadata) {
    applyPatch(result.meta, patch);
  }

  return result;
}

export function patchDeliberationMeta(deliberationMeta, patch = {}) {
  if (!isObject(deliberationMeta) || !isObject(patch) || Object.keys(patch).length === 0) {
    return deliberationMeta;
  }

  applyPatch(deliberationMeta, patch);

  if (deliberationMeta.meta) {
    applyPatch(deliberationMeta.meta, patch);
  }

  if (deliberationMeta.metadata && deliberationMeta.metadata !== deliberationMeta.meta) {
    applyPatch(deliberationMeta.metadata, patch);
  }

  return deliberationMeta;
}

export function patchResultResponse(result, newResponse, metadataPatch = {}) {
  if (!isObject(result)) {
    return result;
  }

  result.response = newResponse;
  patchResultMetadata(result, metadataPatch);
  return result;
}

export function diffMetadata(before = {}, after = {}) {
  const beforeObj = isObject(before) ? before : {};
  const afterObj = isObject(after) ? after : {};
  const keys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);
  const diff = {};

  for (const key of keys) {
    if (!Object.is(beforeObj[key], afterObj[key])) {
      diff[key] = {
        before: beforeObj[key],
        after: afterObj[key]
      };
    }
  }

  return diff;
}
