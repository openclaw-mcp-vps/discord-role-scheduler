import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, ShieldCheck, TimerReset } from "lucide-react";

const faqs = [
  {
    question: "How does the bot know when to remove a role?",
    answer:
      "Every schedule stores a start and end timestamp. A cron endpoint checks due schedules and applies or revokes roles with your bot token, so roles are removed even if no one is online."
  },
  {
    question: "Do moderators still need Discord permissions?",
    answer:
      "No manual moderator action is required after setup. The bot account needs Manage Roles permission and must sit above the managed roles in Discord's role hierarchy."
  },
  {
    question: "Can this run contest roles and temporary VIP access?",
    answer:
      "Yes. Most customers use it for event access, winner badges, temporary staff trial roles, and paywalled channels that expire automatically."
  },
  {
    question: "How is access to the scheduling tool protected?",
    answer:
      "Scheduling actions are behind a paid access cookie. Once Stripe checkout completes and webhook confirmation is received, your account can unlock the dashboard."
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-8 sm:px-8">
      <header className="mb-10 flex items-center justify-between rounded-2xl border border-[#2c3b50] bg-[#111827]/85 px-4 py-3 backdrop-blur sm:px-6">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[#9eb0c6]">Community Tools</p>
          <h1 className="text-lg font-semibold">Discord Role Scheduler</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/api/auth/discord"
            className="rounded-lg border border-[#2c3b50] px-3 py-2 text-sm text-[#cfe4f8] transition hover:bg-white/5"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg bg-[#2376cb] px-3 py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
            Open Dashboard
          </Link>
        </div>
      </header>

      <section className="grid gap-8 pb-14 md:grid-cols-[1.15fr_0.85fr] md:items-center">
        <div>
          <span className="badge inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide">
            Schedule temporary Discord role assignments
          </span>
          <h2 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
            Automate role grants and revokes without moderator busywork.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#9eb0c6] sm:text-lg">
            Community managers lose time manually granting access for events, then later hunting down who still
            has outdated permissions. Discord Role Scheduler handles both sides automatically on your timeline.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK}
              className="button-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
            >
              Buy For $12/mo
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/api/auth/discord"
              className="button-secondary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm"
            >
              Connect Discord
            </Link>
          </div>
          <p className="mt-3 text-sm text-[#8ea6c1]">
            Hosted Stripe checkout. No card forms on your site. Instant dashboard access after payment verification.
          </p>
        </div>

        <div className="card relative overflow-hidden p-6 sm:p-7">
          <div className="absolute -top-16 right-0 h-36 w-36 rounded-full bg-[#3ba1ff33] blur-2xl" />
          <div className="absolute -bottom-16 left-0 h-36 w-36 rounded-full bg-[#22d3a625] blur-2xl" />
          <div className="relative space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-[#2c3b50] bg-[#0f1725]/80 p-3">
              <CalendarClock className="h-5 w-5 text-[#7fc7ff]" />
              <div>
                <p className="text-sm font-medium">Schedule starts and ends</p>
                <p className="text-xs text-[#9eb0c6]">No more manual reminders or spreadsheet tracking.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-[#2c3b50] bg-[#0f1725]/80 p-3">
              <TimerReset className="h-5 w-5 text-[#7fd4c0]" />
              <div>
                <p className="text-sm font-medium">Automatic role removal</p>
                <p className="text-xs text-[#9eb0c6]">Permissions are revoked exactly when they should be.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-[#2c3b50] bg-[#0f1725]/80 p-3">
              <ShieldCheck className="h-5 w-5 text-[#86b9ff]" />
              <div>
                <p className="text-sm font-medium">Audit-friendly history</p>
                <p className="text-xs text-[#9eb0c6]">Track status for each scheduled assignment and failure reason.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 pb-14 md:grid-cols-3">
        <article className="card p-5">
          <h3 className="text-lg font-semibold">The Problem</h3>
          <p className="mt-2 text-sm leading-6 text-[#9eb0c6]">
            Temporary Discord permissions are usually managed by hand. During launches, tournaments, and promotions,
            teams forget to revoke old roles and accidentally leave private channels exposed.
          </p>
        </article>
        <article className="card p-5">
          <h3 className="text-lg font-semibold">The Solution</h3>
          <p className="mt-2 text-sm leading-6 text-[#9eb0c6]">
            Set member, role, start time, and end time once. The scheduler applies the role at kickoff and removes it
            later, backed by webhook logging and recurring cron execution.
          </p>
        </article>
        <article className="card p-5">
          <h3 className="text-lg font-semibold">Why Teams Pay</h3>
          <p className="mt-2 text-sm leading-6 text-[#9eb0c6]">
            For $12 per month, admins avoid permission mistakes, reduce moderation overhead, and gain confidence that
            event-only access won’t leak after deadlines.
          </p>
        </article>
      </section>

      <section id="pricing" className="pb-14">
        <div className="card p-6 sm:p-8">
          <h3 className="text-2xl font-semibold">Pricing</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#9eb0c6]">
            One plan for community teams that need reliable temporary permissions.
          </p>

          <div className="mt-5 rounded-2xl border border-[#2c3b50] bg-[#0f1725]/85 p-5 sm:p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-[#8fa8c2]">Discord Role Scheduler</p>
            <p className="mt-2 text-4xl font-semibold">
              $12<span className="text-base font-normal text-[#9eb0c6]">/month</span>
            </p>
            <ul className="mt-4 space-y-3 text-sm text-[#dbe6f3]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#7fd4c0]" />
                Scheduled role assignments and automatic revokes
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#7fd4c0]" />
                Dashboard management for active and pending schedules
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#7fd4c0]" />
                Stripe-hosted checkout and webhook-backed access unlock
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK}
                className="button-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
              >
                Buy Now
              </a>
              <Link
                href="/dashboard"
                className="button-secondary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm"
              >
                View Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="pb-10">
        <h3 className="text-2xl font-semibold">FAQ</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {faqs.map((faq) => (
            <article key={faq.question} className="card p-5">
              <h4 className="text-base font-semibold">{faq.question}</h4>
              <p className="mt-2 text-sm leading-6 text-[#9eb0c6]">{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#2c3b50] pt-6 text-sm text-[#8fa6c1]">
        Built for community managers who need temporary access control without permission drift.
      </footer>
    </main>
  );
}
