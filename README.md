# monthly-py

Sales-reporting web app for shopping-center tenants. Bun + Hono + SQLite.

## Setup

```sh
bun install
```

## Environment

Required:

| Variable | Description |
| --- | --- |
| `MONTHLY_PY_SESSION_ENCRYPTION_KEY` | Cookie session encryption key (≥ 32 chars). Generate locally with `openssl rand -hex 32`. The app refuses to start without it. Rotating this value invalidates all existing sessions. |
| `MONTHLY_PY_DATABASE_PATH` | (Optional) Path to the SQLite database file. Defaults to `<repo>/data/monthly-py.db`. |

Optional (Office 365 sign-in):

| Variable | Description |
| --- | --- |
| `MONTHLY_PY_O365_CLIENT_ID` | Azure AD application (client) ID. |
| `MONTHLY_PY_O365_CLIENT_SECRET` | Azure AD client secret. |
| `MONTHLY_PY_O365_TENANT_ID` | Azure AD tenant ID. |

If the three `O365_*` variables are unset, the Office 365 sign-in button shows a configuration error and stays disabled, but the username/password form remains available.

## Development

```sh
bun run dev
```

Open http://localhost:3000.

## Admin commands

Create a user:

```sh
bun run cmd/monthly-py_create-user.ts -u <username> -p <password>
```

Change a password:

```sh
bun run cmd/monthly-py_change-password.ts -u <username> -p <new-password>
```
