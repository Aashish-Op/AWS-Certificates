import { siteConfig } from '@/config/site';

export const metadata = {
  title: 'Privacy Policy - AWS SBG LPU Certificates',
  description: 'Privacy policy for AWS Student Builder Group at Lovely Professional University certificate platform.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#F9F9FB] px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-lg border border-[#E9EBED] bg-white p-6 sm:p-10 space-y-6 text-[#0F1B2A]">
        <div>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="mt-1 text-xs text-[#5F6B7A]">Last updated: 12 October 2026</p>
        </div>

        <section className="space-y-2 text-sm leading-relaxed text-[#0F1B2A]">
          <h2 className="text-lg font-bold">1. Overview</h2>
          <p>
            The AWS Student Builder Group at Lovely Professional University (&quot;AWS SBG LPU&quot;, &quot;we&quot;, &quot;us&quot;) operates the certificate issuing and verification platform at <strong className="font-mono">{siteConfig.url}</strong>. This policy explains what information we collect, how it is used, and how credentials are maintained.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-[#0F1B2A]">
          <h2 className="text-lg font-bold">2. Data We Collect</h2>
          <p>
            We collect and process the following categories of student information:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[#5F6B7A]">
            <li><strong>Full Name:</strong> Provided by event organizers from attendance records to issue certificates.</li>
            <li><strong>University Registration Number:</strong> Used as the authoritative primary key linking student accounts to their issued certificates.</li>
            <li><strong>Email Address:</strong> Used strictly for account authentication, password recovery, and login session management.</li>
            <li><strong>Attendance Records:</strong> Event participation records submitted by workshop organizers.</li>
          </ul>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-[#0F1B2A]">
          <h2 className="text-lg font-bold">3. Public Credential Verification</h2>
          <p>
            In order for prospective employers, academic institutions, and third parties to verify certificate authenticity:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[#5F6B7A]">
            <li>The public verification page (<span className="font-mono">/verify/[id]</span>) displays the recipient&apos;s <strong>Full Name</strong>, <strong>Certificate Title</strong>, <strong>Event Date</strong>, and <strong>Certificate ID</strong>.</li>
            <li><strong>Registration numbers and student email addresses are strictly confidential and are NEVER displayed or exposed on any public verification URL.</strong></li>
            <li>Verification pages carry <span className="font-mono">noindex, nofollow</span> search engine directives to protect student privacy from search index crawlers.</li>
          </ul>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-[#0F1B2A]">
          <h2 className="text-lg font-bold">4. Data Retention and Security</h2>
          <p>
            Issued certificates are maintained indefinitely to ensure persistent verifiable credential status for students throughout their professional careers. Access to private storage buckets is strictly restricted via time-limited cryptographically signed URLs.
          </p>
        </section>

        <section className="space-y-2 text-sm leading-relaxed text-[#0F1B2A]">
          <h2 className="text-lg font-bold">5. Contact and Corrections</h2>
          <p>
            If you need a correction on your certificate, or if someone mistakenly registered your registration number, please contact us at:
          </p>
          <div className="rounded bg-[#F9F9FB] p-3 font-mono text-xs border border-[#E9EBED]">
            Email: {siteConfig.supportEmail}
          </div>
        </section>
      </div>
    </div>
  );
}
