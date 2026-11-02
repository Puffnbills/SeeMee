import { integrationStatus } from "@/lib/integrations/status";
import { NextResponse } from "next/server";

export async function GET() {
  const status = integrationStatus();
  return NextResponse.json({ ok: true, dataSource: status.dataSource });
}
