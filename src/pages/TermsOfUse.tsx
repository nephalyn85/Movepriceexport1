import Header from '../components/Header';
import Seo from '../components/Seo';
import Footer from '../components/Footer';
import { useState } from 'react';
import AboutModal from '../components/AboutModal';

export default function TermsOfUse() {
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Seo
        title="Terms of Use | Move Price"
        description="Read the Move Price terms of use. Understand the terms and conditions for using our moving cost calculator, tools, and website."
        canonical="/terms-of-use"
      />
      <Header onAboutClick={() => setIsAboutOpen(true)} />
      <main className="pt-24 pb-12 flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Use</h1>
        <p className="text-slate-500 text-sm mb-8">Effective date: January 1, 2026</p>

        <div className="prose prose-slate max-w-none space-y-6 text-slate-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using Move-Price.com, you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use our website.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">2. Description of Service</h2>
            <p>Move-Price.com is a free moving cost calculator and comparison tool that helps consumers estimate moving costs and connect with moving companies in the United States. We do not perform moving services ourselves.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">3. No Guarantees on Pricing</h2>
            <p>The estimates provided by our calculator are for informational purposes only. Actual moving costs may vary significantly based on specific circumstances, items to be moved, distance, and other factors. We do not guarantee the accuracy of any pricing information.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">4. Third-Party Moving Companies</h2>
            <p>Move-Price.com connects users with independent third-party moving companies. We do not endorse, warrant, or take responsibility for the services provided by these companies. You are solely responsible for evaluating and selecting a moving company.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">5. User Conduct</h2>
            <p>You agree to use Move-Price.com only for lawful purposes. You must not submit false or misleading information, attempt to disrupt the service, or use automated tools to scrape or access the site without permission.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">6. Intellectual Property</h2>
            <p>All content on Move-Price.com, including text, graphics, logos, and software, is the property of Move-Price.com and is protected by applicable copyright and intellectual property laws. You may not reproduce or distribute any content without our written permission.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">7. Limitation of Liability</h2>
            <p>Move-Price.com shall not be liable for any indirect, incidental, or consequential damages arising from your use of our service or your engagement with any third-party moving company found through our platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">8. Changes to Terms</h2>
            <p>We reserve the right to modify these Terms of Use at any time. Continued use of the site after changes are posted constitutes your acceptance of the revised terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">9. Contact Us</h2>
            <p>For questions about these Terms of Use, please contact us at legal@move-price.com.</p>
          </section>
        </div>
      </main>
      <Footer />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
}
