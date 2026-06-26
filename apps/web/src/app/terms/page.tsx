import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — SellItRight',
  description: 'Read the terms and conditions governing your use of SellItRight.',
}

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-gray-600">Last updated: June 2026</p>

      <section className="mt-8 space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">1. Acceptance of Terms</h2>
        <p className="text-gray-600">
          By accessing or using SellItRight, you agree to be bound by these Terms of Service and
          all applicable laws and regulations. If you do not agree with any part of these terms,
          you may not use our platform. We reserve the right to update these terms at any time,
          and continued use of the platform constitutes your acceptance of any changes.
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">2. Use of the Platform</h2>
        <p className="text-gray-600">
          SellItRight provides a marketplace for property listings in India. You agree to use the
          platform only for lawful purposes and in a manner that does not infringe the rights of
          others. You are responsible for ensuring that all information you submit, including
          property details and photographs, is accurate, truthful, and does not violate any
          third-party rights.
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">3. User Accounts</h2>
        <p className="text-gray-600">
          To create listings you must register for an account using a valid Indian mobile number.
          You are responsible for maintaining the confidentiality of your account credentials and
          for all activity that occurs under your account. SellItRight reserves the right to
          suspend or terminate accounts that violate these terms or engage in fraudulent activity.
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">4. Listings and Content</h2>
        <p className="text-gray-600">
          All listings are subject to review and approval. SellItRight may reject or remove any
          listing that does not meet our quality standards, contains inaccurate information, or
          violates applicable laws. You retain ownership of the content you submit but grant
          SellItRight a non-exclusive, royalty-free licence to display and distribute it in
          connection with the platform&apos;s services.
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">5. Limitation of Liability</h2>
        <p className="text-gray-600">
          SellItRight is not a party to any transaction between buyers and sellers and makes no
          warranties regarding the accuracy of listings or the conduct of users. To the fullest
          extent permitted by law, SellItRight shall not be liable for any indirect, incidental,
          special, or consequential damages arising out of or in connection with your use of the
          platform, even if we have been advised of the possibility of such damages.
        </p>
      </section>
    </main>
  )
}
