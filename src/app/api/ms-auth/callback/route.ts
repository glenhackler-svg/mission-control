import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const TENANT_ID     = process.env.MS_TENANT_ID!;
const CLIENT_ID     = process.env.MS_CLIENT_ID!;
const CLIENT_SECRET = process.env.MS_CLIENT_SECRET!;
const REDIRECT      = "http://localhost:3000/api/ms-auth/callback";
const TOKEN_PATH    = path.join(process.cwd(), ".ms-token.json");

export async function GET(req: NextRequest) {
  const code  = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.json({ error, description: req.nextUrl.searchParams.get("error_description") }, { status: 400 });
  }
  if (!code) {
    return NextResponse.json({ error: "No code returned" }, { status: 400 });
  }

  // Exchange code for tokens
  const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type:    "authorization_code",
      code,
      redirect_uri:  REDIRECT,
      scope:         "Calendars.Read offline_access",
    }),
  });

  const tokens = await res.json();
  if (tokens.error) {
    return NextResponse.json(tokens, { status: 400 });
  }

  // Save tokens to disk
  const data = {
    accessToken:  tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt:    Date.now() + (tokens.expires_in * 1000),
  };
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(data, null, 2));

  return new NextResponse(
    `<html><body style="font-family:sans-serif;padding:2rem">
      <h2>✅ Microsoft Calendar connected!</h2>
      <p>glen@xenlerconsulting.com is authenticated. You can close this tab.</p>
      <p><a href="http://localhost:3000/calendar">Go to Calendar</a></p>
    </body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
