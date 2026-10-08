import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '../../../../lib/db';
import { verifySession, SESSION_COOKIE } from '../../../../lib/auth';

/* Manager-only: remove someone's login (a leaver). Their existing sessions
   stop working within about a minute - see verifySession in lib/auth.js.
   Everything they entered (upgrades, time off, health checks, recordings)
   stays, filed under their name; only the ability to sign in goes. A manager
   cannot remove their own account from here. */
export async function DELETE(req, { params }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const me = token ? await verifySession(token) : null;
  if (!me || me.role !== 'manager') return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  if (me.sub === params.id) return NextResponse.json({ error: 'You cannot remove your own account.' }, { status: 400 });

  const { rowCount } = await db().query('delete from users where id = $1', [params.id]);
  if (!rowCount) return NextResponse.json({ error: 'That account no longer exists.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
