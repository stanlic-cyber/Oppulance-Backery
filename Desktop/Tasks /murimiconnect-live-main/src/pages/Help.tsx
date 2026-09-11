import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SUPPORT_PHONE, SUPPORT_CATEGORIES } from '@/lib/constants';
import { Phone, Loader2, HelpCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PageHeader } from '@/components/ui/page-transition';
import { toast } from 'sonner';

const faqs = [
  { q: 'How do I create a listing?', a: 'Sign up as a farmer, then click "Sell Produce" to create your listing with photos and pricing.' },
  { q: 'How do payments work?', a: 'Payments are agreed directly between buyer and farmer via EcoCash, OneMoney, or bank transfer. Murimi Connect does not handle money.' },
  { q: 'Can I negotiate prices?', a: 'Yes! If the seller allows negotiation, you can send offers and counter-offers through the order chat.' },
  { q: 'How do I contact a seller?', a: 'Place an order on their listing to start a conversation and negotiate terms.' },
  { q: 'Is my data safe?', a: 'Yes, we use industry-standard security. Read our Privacy Policy for details.' },
];

const Help = () => {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [contact, setContact] = useState(profile?.phone || user?.email || '');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contact || !category || !message) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('support_tickets').insert({
        user_id: user?.id || null,
        name,
        contact,
        category,
        message,
      });

      if (error) throw error;
      toast.success('Support ticket submitted! We\'ll get back to you soon.');
      setMessage('');
      setCategory('');
    } catch (err) {
      toast.error('Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <PageHeader title={t('support.title')} backTo="/" />

      <div className="bg-muted/30 min-h-screen pb-24 md:pb-8">
        <div className="container max-w-3xl py-4">
          {/* Phone Support */}
          <div className="bg-card rounded-2xl p-4 mb-4 border border-border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t('support.phone')}</p>
                <p className="text-primary font-bold">{SUPPORT_PHONE}</p>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-card rounded-2xl p-5 mb-4 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">{t('support.faq')}</h2>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-sm">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Contact Form */}
          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">{t('support.contact')}</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact">Phone or Email</Label>
                  <Input id="contact" value={contact} onChange={e => setContact(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {SUPPORT_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" value={message} onChange={e => setMessage(e.target.value)} rows={4} required className="resize-none" />
              </div>
              <Button type="submit" className="w-full rounded-xl" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting...</> : t('support.submit')}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Help;
