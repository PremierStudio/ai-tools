import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { exec } from "node:child_process";
import { platform } from "node:os";
import * as p from "@clack/prompts";
import { saveAuth, loadAuth, clearAuth, isTokenExpired } from "./token-store.js";
import type { StoredAuth } from "./token-store.js";

const REDIRECT_PORT = 21347;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;
const REDIRECT_URI_IP = `http://127.0.0.1:${REDIRECT_PORT}/callback`;
const LOGIN_TIMEOUT_MS = 120_000;

type OAuthMetadata = {
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint: string;
  scopes_supported: string[];
};

type RegisteredClient = {
  client_id: string;
  registration_access_token: string;
};

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
};

function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

function generateState(): string {
  return randomBytes(16).toString("base64url");
}

function openBrowser(url: string): void {
  const os = platform();
  const command =
    os === "darwin" ? `open "${url}"` : os === "win32" ? `start "${url}"` : `xdg-open "${url}"`;

  exec(command, (error) => {
    if (error) {
      p.log.warn(`Could not open browser automatically. Please visit:\n  ${url}`);
    }
  });
}

async function discoverEndpoints(serverUrl: string): Promise<OAuthMetadata> {
  const wellKnownUrl = `${serverUrl}/.well-known/oauth-authorization-server`;
  const response = await fetch(wellKnownUrl);

  if (!response.ok) {
    throw new Error(`Failed to discover OAuth endpoints at ${wellKnownUrl} (${response.status})`);
  }

  return (await response.json()) as OAuthMetadata;
}

async function registerClient(registrationEndpoint: string): Promise<RegisteredClient> {
  const response = await fetch(registrationEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "Plannable CLI",
      redirect_uris: [REDIRECT_URI, REDIRECT_URI_IP],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    }),
  });

  if (!response.ok) {
    const error = (await response.json()) as { error_description?: string };
    throw new Error(error.error_description ?? `Client registration failed (${response.status})`);
  }

  const result = (await response.json()) as {
    client_id: string;
    registration_access_token: string;
  };

  return {
    client_id: result.client_id,
    registration_access_token: result.registration_access_token,
  };
}

async function exchangeCode(
  tokenEndpoint: string,
  clientId: string,
  code: string,
  codeVerifier: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  });

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = (await response.json()) as { error_description?: string };
    throw new Error(error.error_description ?? `Token exchange failed (${response.status})`);
  }

  return (await response.json()) as TokenResponse;
}

async function refreshAccessToken(
  serverUrl: string,
  clientId: string,
  refreshToken: string,
): Promise<TokenResponse> {
  const metadata = await discoverEndpoints(serverUrl);

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    refresh_token: refreshToken,
  });

  const response = await fetch(metadata.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error("Token refresh failed. Please re-authenticate.");
  }

  return (await response.json()) as TokenResponse;
}

const CALLBACK_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Plannable</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Geist', system-ui, -apple-system, sans-serif;
      display: flex; align-items: center; justify-content: center;
      height: 100vh; background: #0a0a0f; color: #e5e7eb;
      -webkit-font-smoothing: antialiased;
    }
    .orb {
      position: fixed; border-radius: 50%; filter: blur(200px); pointer-events: none;
    }
    .orb-1 { top: -200px; left: -100px; width: 600px; height: 600px; background: rgba(99,102,241,0.08); }
    .orb-2 { bottom: -200px; right: -100px; width: 500px; height: 500px; background: rgba(67,56,202,0.06); }
    .card {
      position: relative; text-align: center; padding: 3rem 2.5rem;
      border: 1px solid rgba(255,255,255,0.06); border-radius: 1rem;
      background: rgba(255,255,255,0.02); backdrop-filter: blur(24px);
    }
    .icon {
      width: 48px; height: 48px; margin: 0 auto 1.25rem;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.2);
    }
    .icon svg { width: 24px; height: 24px; color: #818cf8; }
    h1 {
      font-size: 1.25rem; font-weight: 600; letter-spacing: -0.01em;
      color: #f3f4f6; margin-bottom: 0.5rem;
    }
    p { font-size: 0.875rem; color: rgba(255,255,255,0.45); }
  </style>
</head>
<body>
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>
  <div class="card">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    </div>
    <h1>Connected to Plannable</h1>
    <p>You can close this tab and return to your terminal.</p>
  </div>
</body>
</html>`;

function waitForCallback(state: string): Promise<{ code: string }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error("Login timed out after 2 minutes. Please try again."));
    }, LOGIN_TIMEOUT_MS);

    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? "/", `http://127.0.0.1:${REDIRECT_PORT}`);

      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const error = url.searchParams.get("error");
      if (error) {
        const description = url.searchParams.get("error_description") ?? error;
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          `<html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0a0a0a;color:#ef4444"><h1>Authorization failed: ${description}</h1></body></html>`,
        );
        clearTimeout(timeout);
        server.close();
        reject(new Error(`Authorization failed: ${description}`));
        return;
      }

      const code = url.searchParams.get("code");
      const returnedState = url.searchParams.get("state");

      if (!code) {
        res.writeHead(400);
        res.end("Missing authorization code");
        return;
      }

      if (returnedState !== state) {
        res.writeHead(400);
        res.end("State mismatch");
        clearTimeout(timeout);
        server.close();
        reject(new Error("OAuth state mismatch — possible CSRF attack."));
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(CALLBACK_HTML);
      clearTimeout(timeout);
      server.close();
      resolve({ code });
    });

    server.listen(REDIRECT_PORT, "127.0.0.1", () => {
      // Server ready
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      clearTimeout(timeout);
      if (err.code === "EADDRINUSE") {
        reject(
          new Error(`Port ${REDIRECT_PORT} is in use. Close the process using it and try again.`),
        );
      } else {
        reject(err);
      }
    });
  });
}

export async function login(serverUrl: string): Promise<StoredAuth> {
  const spin = p.spinner();
  spin.start("Discovering OAuth endpoints...");

  const metadata = await discoverEndpoints(serverUrl);
  spin.stop("OAuth endpoints discovered");

  // Check for existing client registration, or register a new one
  const existing = await loadAuth();
  let clientId: string;
  let registrationAccessToken: string;

  if (existing?.client_id && existing.server_url === serverUrl) {
    const expired = isTokenExpired(existing);
    const dim = "\x1b[2m";
    const r = "\x1b[0m";
    p.log.info(
      [
        "Found existing credentials:",
        `  ${dim}client${r}   ${existing.client_id.slice(0, 8)}...`,
        `  ${dim}server${r}   ${existing.server_url}`,
        `  ${dim}status${r}   ${expired ? "expired" : "active"}`,
      ].join("\n"),
    );

    const action = await p.select({
      message: "What would you like to do?",
      options: [
        {
          value: "reuse",
          label: "Use existing credentials",
          hint: "skip re-auth if still valid on server",
        },
        {
          value: "fresh",
          label: "Start fresh",
          hint: "clear cached credentials and re-register",
        },
      ],
    });

    if (p.isCancel(action)) {
      p.cancel("Setup cancelled.");
      process.exit(0);
    }

    if (action === "fresh") {
      await clearAuth();
      p.log.info("Cleared cached credentials");
      const regSpin = p.spinner();
      regSpin.start("Registering new OAuth client...");
      const registered = await registerClient(metadata.registration_endpoint);
      clientId = registered.client_id;
      registrationAccessToken = registered.registration_access_token;
      regSpin.stop("OAuth client registered");
    } else {
      clientId = existing.client_id;
      registrationAccessToken = existing.registration_access_token;
    }
  } else {
    const regSpin = p.spinner();
    regSpin.start("Registering OAuth client...");
    const registered = await registerClient(metadata.registration_endpoint);
    clientId = registered.client_id;
    registrationAccessToken = registered.registration_access_token;
    regSpin.stop("OAuth client registered");
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();
  const scopes = metadata.scopes_supported.join(" ");

  const authUrl = new URL(metadata.authorization_endpoint);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", scopes);

  p.log.info("Opening browser for authentication...");
  openBrowser(authUrl.toString());

  const spin2 = p.spinner();
  spin2.start("Waiting for authorization (2 min timeout)...");

  const { code } = await waitForCallback(state);
  spin2.stop("Authorization received");

  const spin3 = p.spinner();
  spin3.start("Exchanging authorization code...");

  const tokenResponse = await exchangeCode(metadata.token_endpoint, clientId, code, codeVerifier);

  const auth: StoredAuth = {
    server_url: serverUrl,
    client_id: clientId,
    registration_access_token: registrationAccessToken,
    access_token: tokenResponse.access_token,
    refresh_token: tokenResponse.refresh_token,
    expires_at: Date.now() + tokenResponse.expires_in * 1000,
    scopes: tokenResponse.scope ? tokenResponse.scope.split(" ") : [],
    team_id: "",
  };

  await saveAuth(auth);
  spin3.stop("Authenticated successfully");

  return auth;
}

export async function ensureAuthenticated(serverUrl: string): Promise<StoredAuth> {
  const stored = await loadAuth();

  if (!stored || stored.server_url !== serverUrl) {
    return login(serverUrl);
  }

  if (!isTokenExpired(stored)) {
    return stored;
  }

  // Try silent refresh
  try {
    const tokenResponse = await refreshAccessToken(
      serverUrl,
      stored.client_id,
      stored.refresh_token,
    );

    const refreshed: StoredAuth = {
      ...stored,
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      expires_at: Date.now() + tokenResponse.expires_in * 1000,
      scopes: tokenResponse.scope ? tokenResponse.scope.split(" ") : [],
    };

    await saveAuth(refreshed);
    return refreshed;
  } catch {
    // Refresh failed — client may have been revoked on the server
    p.log.warn(
      "Token refresh failed. The client may have been removed from the server.",
    );
    await clearAuth();
    return login(serverUrl);
  }
}
