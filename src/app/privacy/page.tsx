import { Logo } from "@/components/logo";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Logo />
      <article className="elevator-rise mt-10 space-y-4 text-sm leading-7 text-[#a0a0a0]">
        <p className="text-xs uppercase tracking-[0.16em] text-[#d4af37]">Placeholder legal copy — replace before production</p>
        <h1 className="text-3xl font-semibold text-white">Privacy policy</h1>
        <p>
          AllyCircle stores the profile, scheduling, messaging, and feedback data you provide so we can operate the
          practice network. We do not sell your personal information.
        </p>
        <p>
          Private messages, private improvement notes, and “would you practice again?” answers are visible only to the
          people the product intends. Calendar tokens stay on the server. We keep product analytics without message
          bodies, notes, or secrets.
        </p>
        <p>
          You can delete your account in Settings. This draft must be replaced with counsel-reviewed language before
          production.
        </p>
      </article>
    </div>
  );
}
