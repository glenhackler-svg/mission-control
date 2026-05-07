/**
 * One-time Microsoft Graph auth via device code flow (raw HTTP, no MSAL).
 * Run: npx tsx scripts/ms-auth.ts
 * Saves tokens to .ms-token.json (gitignored).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH = path.join(__dirname, "../.ms-token.json");

const TENANT_ID     = process.env.MS_TENANT_ID     || "0146cb65-5064-4176-b0f7-1e40c865ca00";
const CLIENT_ID     = process.env.MS_CLIENT_ID     || "575e858f-15fe-44ff-903a-f8f1300bfc5c";
const CLIENT_SECRET = process.env.MS_CLIENT_SECRET || "SHG8Q~djimoOUoQtahzjLHB-HSUeCaBNqA7gLbkT";
const SCOPES        = "Calendars.Read offline_access";

async function main() {
  // Step 1: Request device code
  const dcRes = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/devicecode`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: CLIENT_ID, scope: SCOPES }),
    }
  );
  const dc = await dcRes.json() as {
    device_code: string; user_code: string; verification_uri: string;
    expires_in: number; interval: number; message: string;
  };

  if (!dc.device_code) {
    console.error("Failed to get device code:", dc);
    process.exit(1);
  }

  console.log("\n" + dc.message + "\n");

  // Step 2: Poll for token
  const deadline = Date.now() + dc.expires_in * 1000;
  const interval = (dc.interval || 5) * 1000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, interval));

    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type:   "urn:ietf:params:oauth:grant-type:device_code",
          client_id:    CLIENT_ID,
          client_secret: CLIENT_SECRET,
          device_code:  dc.device_code,
        }),
      }
    );
    const token = await tokenRes.json() as Record<string, string>;

    if (token.access_token) {
      const data = {
        accessToken:  token.access_token,
        refreshToken: token.refresh_token,
        expiresAt:    Date.now() + Number(token.expires_in) * 1000,
      };
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(data, null, 2));
      console.log("✅ Token saved to .ms-token.json");
      console.log("Expires:", new Date(data.expiresAt).toLocaleString());
      return;
    }

    if (token.error === "authorization_pending") {
      process.stdout.write(".");
      continue;
    }

    console.error("\nAuth error:", token.error, token.error_description);
    process.exit(1);
  }

  console.error("\nTimed out waiting for authorization.");
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
