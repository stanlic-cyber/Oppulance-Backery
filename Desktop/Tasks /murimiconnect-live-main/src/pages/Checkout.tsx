import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Loader2, CheckCircle, ShoppingCart, CreditCard, FileText, Shield, AlertTriangle } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-transition';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWallet } from '@/hooks/useWallet';
import { TopUpDialog } from '@/components/wallet/TopUpDialog';
import { sendTxEmail, getUserEmail } from '@/lib/email';

const CheckoutPage = () => {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const { wallet, refresh: refreshWallet } = useWallet();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);

  if (!user) return <Navigate to="/auth" replace />;
  if (items.length === 0 && !success) return <Navigate to="/cart" replace />;

  const balance = wallet?.balance_usd ?? 0;
  const insufficient = balance < subtotal;

  const handlePlaceOrders = async () => {
    if (insufficient) {
      toast.error(`Insufficient balance. Top up at least $${(subtotal - balance).toFixed(2)}`);
      setTopupOpen(true);
      return;
    }

    setPlacing(true);
    try {
      // 1. Create orders
      const orders = await Promise.all(
        items.map(async (item) => {
          const { data, error } = await supabase
            .from('orders')
            .insert({
              listing_id: item.listingId,
              buyer_id: user.id,
              quantity: item.quantity,
              offered_price: item.price_per_unit,
            })
            .select('id')
            .single();
          if (error) throw error;

          if (notes.trim() && data) {
            await supabase.from('messages').insert({
              order_id: data.id,
              sender_id: user.id,
              type: 'message' as const,
              text: notes.trim(),
            });
          }
          return data;
        })
      );

      // 2. Lock escrow for each order (atomic, server-side balance check)
      for (const o of orders) {
        if (!o) continue;
        const { error: escrowErr } = await supabase.rpc('escrow_lock', { p_order_id: o.id } as any);
        if (escrowErr) {
          // Hard fail — rollback by cancelling these orders
          await Promise.all(
            orders.filter(Boolean).map((x) =>
              supabase.from('orders').update({ status: 'cancelled' }).eq('id', x!.id)
            )
          );
          throw escrowErr;
        }
      }

      clearCart();
      refreshWallet();
      setSuccess(true);
      toast.success(`${items.length} order(s) placed — $${subtotal.toFixed(2)} held in escrow`);

      // Fire-and-forget transactional emails (don't block UX)
      try {
        if (user.email) {
          sendTxEmail(user.email, 'order_placed_buyer', {
            listingTitle: items.map((i) => i.title).join(', '),
            amount: subtotal.toFixed(2),
          });
        }
        // Notify each unique seller
        const sellerIds = [...new Set(items.map((i) => i.farmerId))];
        for (const sid of sellerIds) {
          const sellerItems = items.filter((i) => i.farmerId === sid);
          const sellerTotal = sellerItems.reduce((s, i) => s + i.price_per_unit * i.quantity, 0);
          getUserEmail(sid).then((email) => {
            sendTxEmail(email, 'order_placed_seller', {
              listingTitle: sellerItems.map((i) => i.title).join(', '),
              amount: sellerTotal.toFixed(2),
            });
          });
        }
      } catch { /* ignore */ }
    } catch (err: any) {
      console.error('Checkout error:', err);
      toast.error(err.message || 'Failed to place orders');
    } finally {
      setPlacing(false);
    }
  };

  if (success) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-sm animate-scale-in">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-foreground">Orders Placed!</h1>
            <p className="text-muted-foreground mb-8">
              Your orders have been sent to the sellers. They will review and respond shortly.
            </p>
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full rounded-xl" onClick={() => navigate('/my-orders')}>
                View My Orders
              </Button>
              <Button variant="outline" size="lg" className="w-full rounded-xl" onClick={() => navigate('/marketplace')}>
                Continue Shopping
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Progress steps
  const steps = [
    { icon: ShoppingCart, label: 'Cart', done: true },
    { icon: FileText, label: 'Review', done: false, active: true },
    { icon: CreditCard, label: 'Confirm', done: false },
  ];

  return (
    <Layout>
      <PageHeader title="Checkout" backTo="/cart" />

      <div className="bg-muted/30 min-h-screen pb-36 md:pb-8">
        <div className="container py-4 md:py-6 max-w-2xl">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  step.active ? 'bg-primary text-primary-foreground shadow-sm' : 
                  step.done ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  <step.icon className="h-3.5 w-3.5" />
                  {step.label}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-6 h-0.5 rounded-full ${step.done ? 'bg-primary' : 'bg-border'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item) => (
                <div key={item.listingId} className="flex gap-3">
                  <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    {item.photo ? (
                      <img src={item.photo} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-lg">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.quantity} {item.unit} × ${item.price_per_unit.toFixed(2)}</p>
                  </div>
                  <p className="font-semibold text-sm">${(item.price_per_unit * item.quantity).toFixed(2)}</p>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">${subtotal.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Message to Sellers</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="notes" className="sr-only">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any special requests or notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={500}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Wallet & Escrow */}
          <Card className={`mb-4 ${insufficient ? 'border-destructive/40 bg-destructive/5' : 'bg-primary/5 border-primary/20'}`}>
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Funds are held in <strong className="text-foreground">secure escrow</strong> until you confirm
                  delivery. If something goes wrong, raise a dispute and we'll mediate.
                </p>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Wallet balance</span>
                <span className="font-semibold">${balance.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Order total</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              {insufficient && (
                <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded-md">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-destructive">
                      Need ${(subtotal - balance).toFixed(2)} more
                    </p>
                    <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={() => setTopupOpen(true)}>
                      Top up your wallet →
                    </Button>
                  </div>
                </div>
              )}
              <Link to="/wallet" className="text-xs text-primary hover:underline block">
                Manage wallet →
              </Link>
            </CardContent>
          </Card>

          {/* Desktop CTA */}
          <div className="hidden md:block">
            <Button
              className="w-full rounded-xl"
              size="lg"
              onClick={handlePlaceOrders}
              disabled={placing}
              variant={insufficient ? 'outline' : 'default'}
            >
              {placing ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Placing Orders...</>
              ) : insufficient ? (
                `Top up to place orders`
              ) : (
                `Place ${items.length} order${items.length > 1 ? 's' : ''} — $${subtotal.toFixed(2)}`
              )}
            </Button>
          </div>
        </div>

        {/* Sticky mobile CTA */}
        <div className="md:hidden fixed bottom-[60px] left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border px-4 py-3 safe-area-bottom">
          <Button
            className="w-full rounded-xl"
            size="lg"
            onClick={handlePlaceOrders}
            disabled={placing}
            variant={insufficient ? 'outline' : 'default'}
          >
            {placing ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Placing...</>
            ) : insufficient ? (
              `Top up to place orders`
            ) : (
              `Place ${items.length} order${items.length > 1 ? 's' : ''} — $${subtotal.toFixed(2)}`
            )}
          </Button>
        </div>
      </div>

      <TopUpDialog open={topupOpen} onOpenChange={setTopupOpen} onSubmitted={refreshWallet} />
    </Layout>
  );
};

export default CheckoutPage;
