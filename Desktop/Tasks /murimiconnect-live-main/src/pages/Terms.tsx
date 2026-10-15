import { Layout } from '@/components/layout/Layout';

const Terms = () => (
  <Layout>
    <div className="container max-w-3xl py-12">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      <div className="prose prose-gray max-w-none">
        <p className="text-muted-foreground mb-6">Last updated: January 2026</p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
        <p className="text-muted-foreground mb-4">By using Murimi Connect, you agree to these Terms of Service. If you disagree, please do not use our platform.</p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">2. Platform Purpose</h2>
        <p className="text-muted-foreground mb-4">Murimi Connect connects farmers with buyers in Zimbabwe. We facilitate connections but are not party to any transactions between users.</p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">3. Payments</h2>
        <p className="text-muted-foreground mb-4 font-semibold">Payment is agreed between buyer and farmer (EcoCash/OneMoney/Bank). Murimi Connect does not hold money or process payments.</p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">4. User Responsibilities</h2>
        <p className="text-muted-foreground mb-4">Users must provide accurate information, not misrepresent products, and conduct themselves professionally.</p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">5. Listing Guidelines</h2>
        <p className="text-muted-foreground mb-4">All listings must be for legitimate agricultural products. Prohibited items include illegal goods, counterfeit products, and non-agricultural items.</p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">6. Dispute Resolution</h2>
        <p className="text-muted-foreground mb-4">Users are encouraged to resolve disputes directly. Murimi Connect may assist but is not responsible for transaction outcomes.</p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">7. Limitation of Liability</h2>
        <p className="text-muted-foreground mb-4">Murimi Connect is not liable for losses arising from transactions between users or misuse of the platform.</p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">8. Contact</h2>
        <p className="text-muted-foreground">Questions? Contact us at +263 778 229 3138.</p>
      </div>
    </div>
  </Layout>
);

export default Terms;
