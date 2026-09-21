import { Logo } from "@/components/logo";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Logo />
      <article className="elevator-rise mt-10 space-y-4 text-sm leading-7 text-[#a0a0a0]">
        <p className="text-xs uppercase tracking-[0.16em] text-[#d4af37]">Placeholder legal copy — replace before production</p>
        <h1 className="text-3xl font-semibold text-white">Terms of use</h1>
        <p>
          AllyCircle is a peer-practice network. It does not provide professional coaching, recruiting, or employment
          services. You agree to treat other members with respect, keep private feedback private, and use the product
          only for mock-interview practice.
        </p>
        <p>
          You are responsible for the information you share. Do not post confidential employer materials. Session
          recordings are not part of this MVP. Google Calendar and Meet are optional integrations operated by Google.
        </p>
        <p>
          We may suspend accounts for harassment, spam, impersonation, or misuse. These terms are a draft placeholder
          and must be reviewed by counsel before a public launch.
        </p>
      </article>
    </div>
  );
}
