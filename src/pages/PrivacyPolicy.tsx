import Header from '../components/Header';
import Seo from '../components/Seo';
import Footer from '../components/Footer';
import { useState } from 'react';
import AboutModal from '../components/AboutModal';

export default function PrivacyPolicy() {
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Seo
        title="Privacy Policy | Move Price"
        description="Read the Move Price privacy policy. Learn how we handle your data, cookies, and personal information when you use our moving cost calculator and tools."
        canonical="/privacy-policy"
      />
      <Header onAboutClick={() => setIsAboutOpen(true)} />
      <main className="pt-24 pb-12 flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mb-8">Effective date: January 1, 2026</p>

        <div className="prose prose-slate max-w-none space-y-6 text-slate-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">1. Information We Collect</h2>
            <p>When you use Move-Price.com, we may collect information you provide directly, such as your name, email address, phone number, and moving details when you submit a quote request. We also automatically collect certain usage data including your IP address, browser type, pages visited, and referring URLs through standard server logs and analytics tools.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">2. How We Use Your Information</h2>
            <p>We use the information we collect to connect you with moving companies, respond to your inquiries, improve our services, and send you relevant communications. We do not sell your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">3. Sharing of Information</h2>
            <p>We may share your contact and moving details with licensed moving companies in our network so they can provide you with quotes. These companies are required to handle your information responsibly. We may also share information when required by law or to protect our legal rights.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">4. Cookies</h2>
            <p>We use cookies and similar tracking technologies to enhance your experience on our site. You can control cookie settings through your browser preferences. Disabling cookies may affect some site functionality.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">5. Data Security</h2>
            <p>We implement reasonable technical and organizational measures to protect your information against unauthorized access, loss, or misuse. However, no method of transmission over the internet is completely secure.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">6. Your Rights</h2>
            <p>Depending on your location, you may have rights to access, correct, or delete your personal data. To exercise these rights, contact us at privacy@move-price.com.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">7. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page with an updated effective date.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">8. Contact Us</h2>
            <p>If you have questions about this Privacy Policy, please contact us at privacy@move-price.com.</p>
          </section>
        </div>
      </main>
      <Footer />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
}
