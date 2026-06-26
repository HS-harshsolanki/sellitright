import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — SellItRight',
  description: 'Learn how SellItRight collects, uses, and protects your personal information.',
}

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-600">Last updated: June 2026</p>

      <section className="mt-8 space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">1. Information We Collect</h2>
        <p className="text-gray-600">
          We collect information you provide directly, such as your mobile number, name, and
          property listing details. We also automatically collect certain technical data including
          your IP address, browser type, and usage patterns when you interact with the platform.
          This information is used solely to operate and improve SellItRight&apos;s services.
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">2. How We Use Your Information</h2>
        <p className="text-gray-600">
          Your information is used to provide and personalise our services, verify user identity,
          process listings, facilitate communication between buyers and sellers, and comply with
          legal obligations. We do not sell your personal data to third parties. We may share
          data with trusted service providers who assist us in operating the platform, subject to
          strict confidentiality obligations.
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">3. Data Storage and Security</h2>
        <p className="text-gray-600">
          All data is stored on servers located in India or other jurisdictions with adequate data
          protection standards. We implement industry-standard security measures including
          encryption, access controls, and regular audits to protect your personal information
          from unauthorised access, alteration, or disclosure. However, no method of transmission
          over the internet is completely secure.
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">4. Your Rights</h2>
        <p className="text-gray-600">
          You have the right to access, correct, or delete your personal data held by us. You may
          also object to processing or request that we restrict how we use your data. To exercise
          any of these rights, please contact us at privacy@sellitright.in. We will respond to
          all valid requests within 30 days in accordance with applicable data protection laws.
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">5. Cookies and Tracking</h2>
        <p className="text-gray-600">
          SellItRight uses cookies and similar technologies to maintain your session, remember
          your preferences, and gather analytics about platform usage. You can control cookie
          settings through your browser preferences. Disabling cookies may affect the
          functionality of certain features. We do not use cookies to serve third-party
          advertising or track you across other websites.
        </p>
      </section>
    </main>
  )
}
