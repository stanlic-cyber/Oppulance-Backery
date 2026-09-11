import { Layout } from '@/components/layout/Layout';

const Privacy = () => (
  <Layout>
    <div className="container max-w-3xl py-12">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <div className="prose prose-gray max-w-none">
        <p className="text-muted-foreground mb-6">Last updated: January 2026</p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
        <p className="text-muted-foreground mb-4">We collect information you provide directly, including name, email, phone number, and location when you create an account or listing.</p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">2. How We Use Your Information</h2>
        <p className="text-muted-foreground mb-4">Your information is used to facilitate connections between farmers and buyers, improve our services, and communicate important updates.</p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">3. Information Sharing</h2>
        <p className="text-muted-foreground mb-4">We share your contact details with other users only when necessary to complete transactions. We never sell your personal data to third parties.</p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">4. Data Security</h2>
        <p className="text-muted-foreground mb-4">We implement industry-standard security measures to protect your personal information from unauthorized access.</p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">5. Your Rights</h2>
        <p className="text-muted-foreground mb-4">You can access, update, or delete your account information at any time through the Settings page.</p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">6. Contact Us</h2>
        <p className="text-muted-foreground">For privacy-related inquiries, contact us at +263 778 229 3138.</p>
      </div>
    </div>
  </Layout>
);

export default Privacy;
