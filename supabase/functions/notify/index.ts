// 한자 노트 · 복습 알림 발송 (Supabase Edge Function, 1분마다 pg_cron이 호출)
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, CRON_KEY, (선택) VAPID_SUBJECT
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SB = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "mailto:vwvwwv123@gmail.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);

const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000, KST = 9 * HOUR;
const kst = (t: number) => new Date(t + KST);                 // UTC 필드로 KST 시각 읽기용
const kst8Today = (t: number) => { const d = kst(t); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 8) - KST; };

type Card = { d?: number; g?: number; L?: number };
type Sub = { endpoint: string; p256dh: string; auth: string; user_id: string };

async function send(subs: Sub[], payload: Record<string, unknown>) {
  const body = JSON.stringify(payload); let ok = 0;
  for (const s of subs) {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 6 * 3600 }); ok++; }
    catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await SB.from("push_subscriptions").delete().eq("endpoint", s.endpoint); }
  }
  return ok;
}
async function sentSince(uid: string, kind: string, since: number) {
  const { data } = await SB.from("notif_log").select("id").eq("user_id", uid).eq("kind", kind).gte("sent_at", new Date(since).toISOString()).limit(1);
  return !!(data && data.length);
}
async function log(uid: string, kind: string, n: number) { await SB.from("notif_log").insert({ user_id: uid, kind, n }); }

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-key") !== Deno.env.get("CRON_KEY")) return new Response("forbidden", { status: 403 });
  let body: any = {}; try { body = await req.json(); } catch { /* empty */ }
  const now = Date.now();

  const { data: subsAll } = await SB.from("push_subscriptions").select("endpoint,p256dh,auth,user_id");
  const subsBy: Record<string, Sub[]> = {};
  for (const s of (subsAll || []) as Sub[]) (subsBy[s.user_id] ||= []).push(s);
  const uids = Object.keys(subsBy);
  if (!uids.length) return Response.json({ ok: true, users: 0 });

  // 테스트: 특정 이메일에게 즉시
  if (body.test_email) {
    const { data: p } = await SB.from("profiles").select("id,name").eq("email", String(body.test_email).toLowerCase()).maybeSingle();
    if (!p || !subsBy[p.id]) return Response.json({ ok: false, reason: "no subscription for that email" });
    const n = await send(subsBy[p.id], { title: "한자 노트", body: `${p.name || ""}님, 알림 테스트예요. 잘 보이면 성공!`, tag: "kn-test", badge: 0 });
    await log(p.id, "test", n); return Response.json({ ok: true, sent: n });
  }

  const [{ data: profs }, { data: progs }] = await Promise.all([
    SB.from("profiles").select("id,name,last_seen").in("id", uids),
    SB.from("progress").select("user_id,state").in("user_id", uids),
  ]);
  const prog: Record<string, any> = {}; for (const r of progs || []) prog[r.user_id] = r.state || {};
  const k = kst(now); const hh = k.getUTCHours(), mm = k.getUTCMinutes(), dd = k.getUTCDate();
  const t8 = kst8Today(now), t8prev = t8 - DAY;
  const is8 = hh === 8 && mm <= 2;              // 08:00~08:02 (크론 지연 여유), 로그로 중복 방지
  let sent = 0;

  for (const p of profs || []) {
    const cards: Record<string, Card> = (prog[p.id]?.cards) || {};
    const list = Object.values(cards).filter(c => typeof c.d === "number");
    const dueAll = list.filter(c => c.d! <= now).length;                       // 지금 복습 대기 전체
    const lastSeen = p.last_seen ? Date.parse(p.last_seen) : 0;
    const subs = subsBy[p.id];

    // (A) 몰라요: 앱을 떠난 지 10~12분, 그 세션에서 '몰라요'한 카드가 아직 대기 중이면 1회
    if (lastSeen && now - lastSeen >= 10 * MIN && now - lastSeen < 12 * MIN) {
      const n = list.filter(c => c.g === 1 && c.d! <= now && (c.L || 0) >= lastSeen - 3 * HOUR).length;
      if (n > 0 && !(await sentSince(p.id, "unknown10", lastSeen))) {
        sent += await send(subs, { title: "한자 노트", body: `아까 헷갈린 ${n}장, 지금 다시 보면 딱 좋아요 (10분 지났어요)`, tag: "kn-unknown", badge: dueAll });
        await log(p.id, "unknown10", n);
      }
    }

    if (!is8) continue;
    // (C) 매월 1일 08:00: 그 전부터 밀려 있던 카드가 있으면 "밀린 한자 복습카드 n개" (이날은 이것만)
    if (dd === 1) {
      const overdue = list.filter(c => c.d! < t8).length;
      if (overdue > 0 && !(await sentSince(p.id, "monthly", t8))) {
        sent += await send(subs, { title: "한자 노트", body: `밀린 한자 복습카드 ${overdue}개`, tag: "kn-monthly", badge: dueAll });
        await log(p.id, "monthly", overdue);
      }
      continue;
    }
    // (B) 매일 08:00: 어제 08:00 이후 새로 복습일이 된 카드가 있을 때만(=카드마다 최초 1회), 밀린 건 다시 알리지 않음
    const fresh = list.filter(c => c.d! > t8prev && c.d! <= t8).length;
    if (fresh > 0 && !(await sentSince(p.id, "daily", t8))) {
      const text = dueAll >= 30 ? `복습이 ${dueAll}장 쌓였어요. 10장만 먼저 해치울까요?` : `오늘 복습 ${dueAll}장이 기다려요`;
      sent += await send(subs, { title: "한자 노트", body: text, tag: "kn-daily", badge: dueAll });
      await log(p.id, "daily", fresh);
    }
  }
  return Response.json({ ok: true, users: uids.length, sent });
});
