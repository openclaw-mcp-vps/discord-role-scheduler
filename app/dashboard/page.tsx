import Link from "next/link";
import { CheckCircle2, Lock, Shield, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

import ScheduleForm from "@/components/ScheduleForm";
import { getSessionFromServer, hasPaidAccessFromServer } from "@/lib/auth";
import { listSchedulesByCreator } from "@/lib/database";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSessionFromServer();

  if (!session) {
    redirect("/");
  }

  const hasPaidAccess = await hasPaidAccessFromServer(session.userId);
  const schedules = hasPaidAccess ? await listSchedulesByCreator(session.userId) : [];

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-8 sm:px-8">
      <header className="card mb-8 flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          {session.avatarUrl ? (
            <img
              src={session.avatarUrl}
              alt={`${session.username} avatar`}
              className="h-10 w-10 rounded-full border border-[#2c3b50]"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#2c3b50] bg-[#0f1725] text-sm font-semibold">
              {session.username.slice(0, 1).toUpperCase()}
            </div>
          )}

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#8fa8c2]">Dashboard</p>
            <h1 className="text-xl font-semibold">Welcome, {session.username}</h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/" className="button-secondary rounded-lg px-3 py-2 text-sm">
            Landing Page
          </Link>
          <Link href="/api/auth/logout" className="button-secondary rounded-lg px-3 py-2 text-sm">
            Sign Out
          </Link>
        </div>
      </header>

      {!hasPaidAccess ? (
        <section className="space-y-5">
          <div className="card p-6 sm:p-7">
            <div className="mb-4 flex items-center gap-2 text-[#7fd4c0]">
              <Lock className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-[0.18em]">Subscription Required</span>
            </div>
            <h2 className="text-3xl font-semibold">Unlock role scheduling automation</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#9eb0c6]">
              Your Discord account is signed in, but scheduling actions are locked until payment is verified. Use the
              Stripe checkout link, then return and unlock your account.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <article className="rounded-xl border border-[#2c3b50] bg-[#0f1725]/80 p-4">
                <Sparkles className="h-5 w-5 text-[#87c2ff]" />
                <p className="mt-2 text-sm font-medium">1. Complete checkout</p>
                <p className="mt-1 text-xs text-[#95acc6]">Pay through Stripe hosted checkout.</p>
              </article>
              <article className="rounded-xl border border-[#2c3b50] bg-[#0f1725]/80 p-4">
                <Shield className="h-5 w-5 text-[#89d9ff]" />
                <p className="mt-2 text-sm font-medium">2. Webhook confirms payment</p>
                <p className="mt-1 text-xs text-[#95acc6]">Your payer email is registered securely.</p>
              </article>
              <article className="rounded-xl border border-[#2c3b50] bg-[#0f1725]/80 p-4">
                <CheckCircle2 className="h-5 w-5 text-[#7fd4c0]" />
                <p className="mt-2 text-sm font-medium">3. Unlock access cookie</p>
                <p className="mt-1 text-xs text-[#95acc6]">Activate scheduling in this browser session.</p>
              </article>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK}
                className="button-primary rounded-xl px-5 py-3 text-sm font-semibold"
              >
                Buy For $12/mo
              </a>
            </div>

            <form action="/api/payments/verify" method="post" className="mt-6 space-y-3">
              <label className="block text-sm text-[#dce7f5]" htmlFor="email">
                Checkout email (optional if same as Discord email)
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="billing@yourcommunity.com"
                className="input-shell w-full max-w-md rounded-xl px-3 py-2 text-sm"
              />
              <button type="submit" className="button-secondary rounded-xl px-4 py-2 text-sm">
                I Paid, Unlock Dashboard
              </button>
            </form>
          </div>
        </section>
      ) : (
        <ScheduleForm initialSchedules={schedules} />
      )}
    </main>
  );
}
