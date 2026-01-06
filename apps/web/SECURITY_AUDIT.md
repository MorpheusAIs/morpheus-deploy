# Security Audit Report: Morpheus Deploy Web Dashboard

**Audit Date:** 2026-01-06
**Scope:** `apps/web/` - Landing page and dashboard with Web3 functionality
**Severity Levels:** CRITICAL, HIGH, MEDIUM, LOW, INFO

---

## Executive Summary

This security audit of the Morpheus Deploy web application reveals **several critical and high-severity vulnerabilities** that must be addressed before production deployment. The application is currently in a prototype/mock state with dependencies installed but not properly configured, creating significant security gaps.

**Key Findings:**
- 2 CRITICAL vulnerabilities
- 4 HIGH-severity issues
- 5 MEDIUM-severity issues
- 3 LOW-severity issues
- 4 Informational/Architectural concerns

---

## CRITICAL Vulnerabilities

### 1. [CRITICAL] Web3 Provider Not Configured - Authentication Bypass

**Location:** `src/app/layout.tsx`, `src/app/deploy/page.tsx:86-127`

**Description:**
The application lists `wagmi`, `viem`, `siwe`, and `connectkit` as dependencies but **does not configure any Web3 providers**. The `RootLayout` component lacks the required provider wrappers:

```tsx
// Current layout.tsx - NO PROVIDERS
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
```

**Impact:**
- Wallet connection is **simulated with setTimeout** (line 91 in deploy/page.tsx), not actual blockchain authentication
- No transaction signing capability
- Users cannot actually connect wallets despite the UI suggesting they can
- When real functionality is added, improperly configured providers could leak private keys or enable transaction manipulation

**Recommendation:**
```tsx
// Required provider setup
import { WagmiConfig, createConfig } from 'wagmi';
import { ConnectKitProvider } from 'connectkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export default function RootLayout({ children }) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}
```

---

### 2. [CRITICAL] Insecure API Key Generation

**Location:** `src/app/settings/page.tsx:123-137`

**Description:**
API keys are generated client-side using `Math.random()`, which is **not cryptographically secure**:

```tsx
const handleCreateKey = () => {
  const mockSecret = `mor_sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  // ...
};
```

**Impact:**
- `Math.random()` is predictable and can be reverse-engineered
- Attackers could potentially predict future API keys
- Keys are stored only in React state, lost on page refresh
- No backend persistence means keys are meaningless

**Recommendation:**
- Generate API keys server-side using `crypto.randomBytes()` or equivalent
- Store keys securely in database with proper hashing (bcrypt/argon2)
- Return key only once, store hash for comparison

---

## HIGH Severity Issues

### 3. [HIGH] Missing Security Headers

**Location:** `next.config.mjs`

**Description:**
No security headers are configured in the Next.js configuration:

```javascript
const config = {
  reactStrictMode: true,
  transpilePackages: ['@morpheus-deploy/core', '@morpheus-deploy/contracts'],
  // NO SECURITY HEADERS
};
```

**Missing Headers:**
- `Content-Security-Policy` - Prevents XSS and data injection
- `X-Frame-Options` - Prevents clickjacking
- `X-Content-Type-Options` - Prevents MIME sniffing
- `Strict-Transport-Security` - Enforces HTTPS
- `X-XSS-Protection` - Legacy XSS protection
- `Referrer-Policy` - Controls referrer information
- `Permissions-Policy` - Controls browser features

**Recommendation:**
```javascript
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.akash.network wss://*.akash.network https://api.skip.money;"
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
];

const config = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  }
};
```

---

### 4. [HIGH] No Authentication Middleware

**Location:** All page routes

**Description:**
Protected pages (`/dashboard`, `/settings`, `/deploy`) are accessible without authentication:

- No session validation
- No wallet signature verification
- No middleware to protect routes
- Mock wallet address displayed: `0x1234...5678`

**Impact:**
- Anyone can access sensitive deployment information
- Unauthorized users could view API keys, wallet balances, deployment logs
- When backend is connected, unauthorized access to user data

**Recommendation:**
```tsx
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session');

  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/deploy', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*'],
};
```

---

### 5. [HIGH] SIWE (Sign-In with Ethereum) Not Implemented

**Location:** `package.json` (dependency unused)

**Description:**
The `siwe` package is listed as a dependency but nowhere in the codebase is it used. SIWE provides:
- Cryptographic wallet-based authentication
- Session management tied to wallet ownership
- Nonce-based replay attack prevention

**Impact:**
- No secure authentication mechanism
- Cannot verify wallet ownership
- Vulnerable to session hijacking when implemented incorrectly

**Recommendation:**
Implement SIWE with proper nonce generation and verification:
```tsx
import { SiweMessage } from 'siwe';

// Server-side nonce generation
app.get('/api/auth/nonce', (req, res) => {
  const nonce = generateNonce();
  req.session.nonce = nonce;
  res.json({ nonce });
});

// Server-side verification
app.post('/api/auth/verify', async (req, res) => {
  const { message, signature } = req.body;
  const siweMessage = new SiweMessage(message);
  const result = await siweMessage.verify({ signature, nonce: req.session.nonce });
  // ...
});
```

---

### 6. [HIGH] Unvalidated External URL Construction

**Location:** `src/app/dashboard/page.tsx:196-204`

**Description:**
Deployment URLs are constructed by prepending `https://` to user-controlled data:

```tsx
<a
  href={`https://${deployment.url}`}
  target="_blank"
  rel="noopener noreferrer"
>
```

**Impact:**
- If `deployment.url` comes from backend and can be manipulated, could lead to:
  - Phishing attacks (linking to malicious domains)
  - JavaScript protocol injection (`javascript:alert(1)`)
  - Data exfiltration via URL parameters

**Recommendation:**
```tsx
const isValidAkashUrl = (url: string) => {
  const pattern = /^[a-z0-9]+\.akash\.network$/;
  return pattern.test(url);
};

{isValidAkashUrl(deployment.url) && (
  <a href={`https://${deployment.url}`} ...>
)}
```

---

## MEDIUM Severity Issues

### 7. [MEDIUM] Repository URL Not Validated

**Location:** `src/app/deploy/page.tsx:174-180`

**Description:**
The repository URL input accepts any string without validation:

```tsx
<input
  type="text"
  placeholder="github.com/username/repo"
  value={config.repoUrl}
  onChange={(e) => onUpdate({ repoUrl: e.target.value })}
/>
```

**Impact:**
- When backend is implemented, could lead to:
  - Server-Side Request Forgery (SSRF) if URL is fetched server-side
  - Command injection if URL is passed to git clone
  - Path traversal attacks

**Recommendation:**
```tsx
const validateRepoUrl = (url: string): boolean => {
  const githubPattern = /^(https?:\/\/)?(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/;
  return githubPattern.test(url);
};
```

---

### 8. [MEDIUM] No CSRF Protection

**Location:** All form submissions

**Description:**
No CSRF tokens are implemented for state-changing operations:
- API key creation/deletion
- GitHub connection/disconnection
- Auto top-up settings
- Deployment creation

**Impact:**
- When API routes are added, malicious sites could trigger unauthorized actions

**Recommendation:**
- Implement CSRF tokens for all POST/PUT/DELETE operations
- Use SameSite cookie attribute
- Validate Origin/Referer headers

---

### 9. [MEDIUM] Sensitive Data in Client State

**Location:** `src/app/settings/page.tsx:120-121, 372-373`

**Description:**
Sensitive data is stored in React state and visible in browser DevTools:

```tsx
const [newKeySecret, setNewKeySecret] = useState<string | null>(null);
const [showSecret, setShowSecret] = useState(false);
```

**Impact:**
- API keys visible in React DevTools
- Ephemeral keys visible when toggled
- No encryption at rest in browser memory

**Recommendation:**
- Never store actual secrets in client state
- Use secure HttpOnly cookies for session data
- Clear sensitive data from state after use

---

### 10. [MEDIUM] Clipboard API Without Permission Check

**Location:** `src/app/settings/page.tsx:139-144`

**Description:**
```tsx
const handleCopy = () => {
  if (newKeySecret) {
    navigator.clipboard.writeText(newKeySecret);
    // ...
  }
};
```

**Impact:**
- No error handling if clipboard access is denied
- Potential for clipboard hijacking on older browsers

**Recommendation:**
```tsx
const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(newKeySecret);
    setCopied(true);
  } catch (err) {
    console.error('Clipboard access denied');
    // Fallback or user notification
  }
};
```

---

### 11. [MEDIUM] useSearchParams Without Validation

**Location:** `src/app/deploy/page.tsx:498-500`

**Description:**
URL parameters are used directly without sanitization:

```tsx
const searchParams = useSearchParams();
const initialRepo = searchParams.get('repo') || '';
const initialTemplate = (searchParams.get('template') || 'ai-agent') as DeployConfig['template'];
```

**Impact:**
- Template parameter is cast without validation (could be invalid type)
- Repo parameter could contain malicious URLs
- Potential for parameter pollution attacks

**Recommendation:**
```tsx
const validTemplates = ['ai-agent', 'mcp-server', 'website', 'custom'] as const;
const rawTemplate = searchParams.get('template');
const initialTemplate = validTemplates.includes(rawTemplate as any)
  ? rawTemplate as DeployConfig['template']
  : 'ai-agent';
```

---

## LOW Severity Issues

### 12. [LOW] Hardcoded Mock Wallet Address

**Location:** `src/app/dashboard/page.tsx:130`, `src/app/settings/page.tsx:81, 393`

**Description:**
Hardcoded wallet address `0x1234...5678` and `0x1234567890abcdef1234567890abcdef12345678` displayed in UI.

**Impact:**
- User confusion about wallet state
- Potential phishing vector if users mistake mock for real

**Recommendation:**
- Replace with actual wallet connection state
- Show "Not Connected" when no wallet

---

### 13. [LOW] External Link Basescan URL Not Validated

**Location:** `src/app/settings/page.tsx:397-404`

**Description:**
```tsx
<a
  href="https://basescan.org/address/0x1234567890abcdef1234567890abcdef12345678"
  target="_blank"
  rel="noopener noreferrer"
>
```

**Impact:**
- When dynamic address is used, need to validate to prevent injection

---

### 14. [LOW] Console Error Potential in Terminal Animation

**Location:** `src/components/terminal-animation.tsx:53`

**Description:**
The `onComplete` callback in TypedText could cause issues if component unmounts during typing animation.

**Recommendation:**
Add cleanup and mounted check:
```tsx
useEffect(() => {
  let mounted = true;
  // ...
  if (mounted) onComplete();
  return () => { mounted = false; };
}, []);
```

---

## Informational / Architectural Concerns

### 15. [INFO] No Rate Limiting Infrastructure

When API endpoints are implemented, there's no rate limiting:
- API key usage
- Deployment creation
- Authentication attempts
- GitHub webhook processing

**Recommendation:** Implement rate limiting using `@upstash/ratelimit` or similar.

---

### 16. [INFO] WebSocket Log Streaming Security (Future)

The application mentions "Real-Time Logs" with WebSocket streaming. When implemented:
- WebSocket connections must be authenticated
- Implement origin validation
- Use WSS (secure WebSocket)
- Implement heartbeat/timeout

---

### 17. [INFO] GitHub OAuth Security (Future)

GitHub integration mentions OAuth. When implemented:
- Use state parameter to prevent CSRF
- Validate callback URL
- Store tokens securely (encrypted)
- Implement token refresh

---

### 18. [INFO] Auto Top-Up Transaction Authorization

Auto top-up feature requires:
- User consent for automatic transactions
- Transaction limits
- Approval flow with signature
- Emergency stop mechanism

---

## Dependency Audit

| Package | Version | Known Vulnerabilities |
|---------|---------|----------------------|
| next | ^14.2.0 | Check for latest patches |
| react | ^18.3.0 | No known issues |
| wagmi | ^2.12.0 | No known issues |
| viem | ^2.21.0 | No known issues |
| siwe | ^2.3.0 | No known issues |
| framer-motion | ^11.3.0 | No known issues |

**Recommendation:** Run `pnpm audit` regularly and update dependencies.

---

## Remediation Priority

### Immediate (Before Beta):
1. Configure Web3 providers properly
2. Implement SIWE authentication
3. Add security headers
4. Create authentication middleware
5. Move API key generation to server-side

### Before Production:
1. Implement CSRF protection
2. Validate all user inputs
3. Add rate limiting
4. Implement proper session management
5. Security audit of API endpoints

### Ongoing:
1. Regular dependency updates
2. Security monitoring
3. Penetration testing
4. Bug bounty program consideration

---

## Conclusion

The Morpheus Deploy web application is currently in a **prototype state** with significant security gaps. The core Web3 authentication infrastructure is not implemented despite dependencies being listed. Before any production use, the critical and high-severity issues must be addressed.

**Overall Security Posture:** HIGH RISK (Prototype/Development only)

---

*This audit was performed as a static code analysis. Dynamic testing and penetration testing are recommended before production deployment.*
