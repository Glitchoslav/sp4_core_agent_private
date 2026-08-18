import identitySubstrate from './identity-substrate/index.cjs';

const {
  createApiAuthorizer,
  resolveLegacyReadOnlyPrincipal
} = identitySubstrate;

const BAD_REQUEST_CODES = new Set(['MISSING_FIELD', 'MISSING_MEMBER_ASSERTION']);
const FORBIDDEN_CODES = new Set(['SUBJECT_MISMATCH', 'NOT_COMMUNITY_MEMBER']);

function header(req, name) {
  const value = req.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
}

function routeContext(req) {
  // Express trims req.path inside app.use('/prefix'); originalUrl keeps the
  // complete API domain that the client signed.
  const path = String(req.originalUrl || req.path || '').split('?')[0];
  const memberMatch = /^\/api\/member\/([^/]+)\//.exec(path);
  const isPurge = path === '/api/member/purge';
  const isCollective = path.startsWith('/api/collective/');
  const memberId = memberMatch?.[1]
    ?? (isPurge ? req.body?.memberId : null);
  return {
    path,
    memberId: memberId === null || memberId === undefined ? null : String(memberId),
    communityId: isCollective
      ? String(header(req, 'x-sp4-community-id') || 'dhz')
      : null,
    entryId: req.query?.entry_id ?? req.body?.entryId ?? null,
    query: req.query || {},
    isCollective
  };
}

function sendIdentityError(res, error) {
  const code = error?.code || 'IDENTITY_AUTH_FAILED';
  if (BAD_REQUEST_CODES.has(code)) return res.status(400).json({ ok: false, error: code });
  if (FORBIDDEN_CODES.has(code)) return res.status(403).json({ ok: false, error: code });
  return res.status(401).json({ ok: false, error: code });
}

export function createBridgeIdentityAuth({ db, now = Date.now } = {}) {
  const authorizer = createApiAuthorizer({ db, now });

  return function requireIdentityProof(req, res, next) {
    const context = routeContext(req);
    const credentialId = header(req, 'x-sp4-credential-id');

    try {
      if (!credentialId) {
        if (String(req.method).toUpperCase() !== 'GET') {
          const error = new Error('CREDENTIAL_REQUIRED');
          error.code = 'CREDENTIAL_REQUIRED';
          throw error;
        }

        const assertedMemberId = header(req, 'x-sp4-member-id');
        if (context.memberId !== null && String(assertedMemberId || '') !== context.memberId) {
          const error = new Error('SUBJECT_MISMATCH');
          error.code = 'SUBJECT_MISMATCH';
          throw error;
        }
        req.sp4Principal = resolveLegacyReadOnlyPrincipal(db, {
          memberId: assertedMemberId || context.memberId,
          communityId: context.communityId
        });
        return next();
      }

      req.sp4Principal = authorizer.authorize({
        method: req.method,
        path: context.path,
        memberId: context.memberId,
        communityId: context.communityId,
        entryId: context.entryId,
        query: context.query,
        body: req.body ?? null,
        credentialId: String(credentialId),
        issuedAt: String(header(req, 'x-sp4-issued-at') || ''),
        nonce: String(header(req, 'x-sp4-nonce') || ''),
        signatureB64: String(header(req, 'x-sp4-signature') || '')
      });
      return next();
    } catch (error) {
      return sendIdentityError(res, error);
    }
  };
}

export { routeContext };
