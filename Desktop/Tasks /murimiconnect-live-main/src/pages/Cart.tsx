import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, Package } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PageHeader, EmptyState } from '@/components/ui/page-transition';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const CartPage = () => {
  const { items, removeItem, updateQuantity, clearCart, subtotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (!user) {
      toast.error('Please sign in to checkout');
      navigate('/auth');
      return;
    }
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <Layout>
        <PageHeader title="Cart" backTo="/" />
        <EmptyState
          icon={<ShoppingCart className="h-8 w-8 text-muted-foreground" />}
          title="Your cart is empty"
          description="Browse the marketplace and add items to your cart"
          action={
            <Button asChild className="rounded-xl">
              <Link to="/marketplace">
                <Package className="h-4 w-4 mr-2" />
                Browse Marketplace
              </Link>
            </Button>
          }
        />
      </Layout>
    );
  }

  const farmerGroups = items.reduce((acc, item) => {
    if (!acc[item.farmerId]) acc[item.farmerId] = [];
    acc[item.farmerId].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  return (
    <Layout>
      <PageHeader 
        title={`Cart (${items.length})`} 
        backTo="/"
        action={
          <button onClick={clearCart} className="text-sm text-muted-foreground hover:text-destructive transition-colors">
            Clear All
          </button>
        }
      />

      <div className="bg-muted/30 min-h-screen pb-36 md:pb-8">
        <div className="container py-4 md:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-3">
              {Object.entries(farmerGroups).map(([farmerId, farmerItems]) => (
                <Card key={farmerId} className="overflow-hidden">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      Seller: {farmerItems[0].province}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    {farmerItems.map((item) => (
                      <div key={item.listingId} className="flex gap-3">
                        <Link to={`/listing/${item.listingId}`} className="flex-shrink-0">
                          <div className="h-20 w-20 rounded-xl bg-muted overflow-hidden">
                            {item.photo ? (
                              <img src={item.photo} alt={item.title} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <Package className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link to={`/listing/${item.listingId}`} className="font-medium text-sm hover:text-primary truncate block">
                            {item.title}
                          </Link>
                          <p className="text-sm font-bold text-primary mt-0.5">
                            ${item.price_per_unit.toFixed(2)}<span className="text-xs font-normal text-muted-foreground">/{item.unit}</span>
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1.5">
                              <button
                                className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors press-effect touch-target"
                                onClick={() => updateQuantity(item.listingId, item.quantity - 1)}
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="text-sm font-semibold w-10 text-center">{item.quantity}</span>
                              <button
                                className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors press-effect touch-target"
                                onClick={() => updateQuantity(item.listingId, item.quantity + 1)}
                                disabled={item.quantity >= item.maxQuantity}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm">${(item.price_per_unit * item.quantity).toFixed(2)}</p>
                              <button
                                onClick={() => removeItem(item.listingId)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-target"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary — Desktop */}
            <div className="hidden lg:block">
              <Card className="sticky top-16">
                <CardHeader>
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.map((item) => (
                    <div key={item.listingId} className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate mr-2">{item.title} × {item.quantity}</span>
                      <span className="font-medium flex-shrink-0">${(item.price_per_unit * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Subtotal</span>
                    <span className="text-primary">${subtotal.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Final price may change based on negotiation</p>
                  <Button className="w-full rounded-xl" size="lg" onClick={handleCheckout}>
                    Proceed to Checkout
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button variant="outline" className="w-full rounded-xl" asChild>
                    <Link to="/marketplace">Continue Shopping</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Sticky bottom CTA — Mobile */}
        <div className="lg:hidden fixed bottom-[60px] left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border px-4 py-3 safe-area-bottom">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="text-lg font-bold text-primary">${subtotal.toFixed(2)}</span>
          </div>
          <Button className="w-full rounded-xl" size="lg" onClick={handleCheckout}>
            Checkout ({items.length} items)
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default CartPage;
