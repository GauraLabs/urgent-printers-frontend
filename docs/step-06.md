# Step 6 — Auth Flow

## Files created
| Path | Type | Purpose |
|---|---|---|
| `features/auth/store.ts` | Updated | Added `_isHydrated` flag + `onRehydrateStorage` callback to avoid auth-guard flash |
| `features/auth/AuthGuard.tsx` | Client | Waits for Zustand hydration, then redirects unauthenticated users to `/auth/login?redirect=<path>` |
| `components/common/FormField.tsx` | Server (forwardRef) | Label + Input + error message + hint; sets `aria-invalid` and `aria-describedby` for accessibility |
| `app/auth/layout.tsx` | Server | Centred card layout with logo; wraps all `/auth/*` pages |
| `app/auth/login/page.tsx` | Client | `react-hook-form` + `zod`; password show/hide; `useSearchParams` wrapped in Suspense for static export |
| `app/auth/register/page.tsx` | Client | Full registration form; Indian phone regex; confirm-password cross-field validation |
| `app/auth/verify/page.tsx` | Client | 6-input OTP component; auto-advances on digit entry; clipboard paste support; resend button |
| `app/account/layout.tsx` | Server | Wraps `<AuthGuard>` — redirects unauthenticated users |
| `app/checkout/layout.tsx` | Server | Wraps `<AuthGuard>` — redirects unauthenticated users |
| `app/account/page.tsx` | Server | Stub — full dashboard built in Step 7 |
| `app/checkout/page.tsx` | Server | Stub — full flow built in Step 8 |

## Auth flow
1. User visits `/account` or `/checkout` → AuthGuard checks `_isHydrated + isAuthenticated`
2. Not authenticated → `router.replace('/auth/login?redirect=/account')`
3. User logs in → `setUser(user, token)` → `router.replace(redirect)`
4. Registration → redirect to `/auth/verify?email=...`
5. OTP (demo: `123456`) → auto-login → redirect to `/account`

## Key decisions
- `_isHydrated` prevents flash-redirect: guard shows a spinner until Zustand rehydrates from `localStorage`
- `useSearchParams` in Login wrapped in `<Suspense>` so the page can be statically exported
- Auth state persisted in `localStorage` via Zustand `persist` — tokens survive page refresh
- Phone validation uses Indian mobile regex `^[6-9]\d{9}$`

## API swap path
Swap bodies in `lib/api/auth.ts`: `login`, `register`, `verifyOtp`, `getMe` — function signatures unchanged.
