import { NextResponse } from "next/server";
import { reseedPglite, usePgliteForVercel } from "@/db";

/* -------------------------------------------------------------------------- */
/*  POST /api/seed                                                             */
/*  (Re)seeds the PGlite database with the fictional demo dataset.             */
/*  Intended for the Vercel demo deployment, where the in-memory PGlite        */
/*  database is reset on each cold start and auto-seeded. Call this endpoint   */
/*  to force a re-seed without redeploying.                                    */
/* -------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

export async function POST() {
  if (!usePgliteForVercel) {
    return NextResponse.json(
      { error: "Seeding via API is only available in PGlite mode." },
      { status: 400 },
    );
  }

  try {
    await reseedPglite();
    return NextResponse.json({ ok: true, message: "Database reseeded." });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
