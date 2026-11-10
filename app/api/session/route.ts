// /api/session
//   GET    → { session } rebuilt from the signed cookie (the client's
//            localStorage copy is only a display cache of this)
//   DELETE → logout: clears the cookie

import { NextResponse } from "next/server"
import { requireSession } from "@/lib/session/guard"
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/session/token"

export const dynamic = "force-dynamic"

const NO_STORE = { "Cache-Control": "no-store" } as const

export async function GET(req: Request) {
  const guard = requireSession(req)
  if (!guard.ok) {
    // A present-but-invalid cookie (tampered/expired) is dropped so the browser stops sending it.
    if (req.headers.get("cookie")?.includes(`${SESSION_COOKIE_NAME}=`)) {
      guard.response.cookies.set(SESSION_COOKIE_NAME, "", { ...sessionCookieOptions(), maxAge: 0 })
    }
    return guard.response
  }
  const s = guard.session
  return NextResponse.json(
    {
      session: {
        userId: s.userId,
        email: s.email,
        name: s.name,
        role: s.role,
        loggedInAt: new Date(s.iat * 1000).toISOString(),
        jobRole: s.jobRole ?? undefined,
        businessUnit: s.businessUnit ?? undefined,
        office: s.office ?? undefined,
      },
    },
    { headers: NO_STORE },
  )
}

export async function DELETE(req: Request) {
  const guard = requireSession(req)
  const res = guard.ok ? NextResponse.json({ ok: true }, { headers: NO_STORE }) : guard.response
  res.cookies.set(SESSION_COOKIE_NAME, "", { ...sessionCookieOptions(), maxAge: 0 })
  return res
}
