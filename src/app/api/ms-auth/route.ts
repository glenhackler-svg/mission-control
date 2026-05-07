import { NextResponse } from "next/server";

const TENANT_ID   = process.env.MS_TENANT_ID!;
const CLIENT_ID   = process.env.MS_CLIENT_ID!;
const REDIRECT    = "http://localhost:3000/api/ms-auth/callback";
const SCOPES      = "Calendars.Read offline_access";

export async function GET() {
  const url = new URL(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id",     CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri",  REDIRECT);
  url.searchParams.set("scope",         SCOPES);
  url.searchParams.set("response_mode", "query");
  return NextResponse.redirect(url.toString());
}
