import { NextResponse } from 'next/server';

/**
 * Liveness / readiness probe for this zone app.
 *
 * Deliberately has NO dependencies — no database, no backend call, no session.
 * Two reasons:
 *
 *  1. A probe that touches a backend kills the pod when the BACKEND is down.
 *     The app is not unhealthy in that case; its dependency is. That matters
 *     more here than in the other zones: this app calls five backend services
 *     across its 34 BFF routes, so a dependency-aware probe would make it the
 *     most restart-prone app in the estate for reasons outside its control.
 *
 *  2. It must answer without a session, or the kubelet (which carries no
 *     cookie) fails every check and the pod never becomes Ready.
 *
 * It also doubles as the zone-hop test. With basePath this is served at
 * /cash-advance/api/health, a path the Shell does not have — so a 200 there
 * proves the request genuinely reached THIS app rather than the Shell.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    app: 'cash-advance',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
