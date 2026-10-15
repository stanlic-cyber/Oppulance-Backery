import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Clock, CheckCircle2, AlertCircle, Truck, Package, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OrderStatusActions } from '@/components/orders/OrderStatusActions';
import { DeliveryStatusSection } from '@/components/delivery/DeliveryStatusSection';
import { formatCurrency } from '@/lib/platformFee';
import { OrderStatus, getStatusColor, getStatusLabel } from '@/lib/orderStatus';
import { cn } from '@/lib/utils';

interface OrderCardProps {
  order: {
    id: string;
    quantity: number;
    offered_price: number;
    status: OrderStatus;
    created_at: string;
    listing_id: string;
    buyer_id: string;
    subtotal?: number;
    platform_fee_percent?: number;
    platform_fee_amount?: number;
    total_amount?: number;
    confirmed_at?: string;
    listing_title: string;
    listing_unit: string;
    listing_photos: string[];
    farmer_id: string;
    farmer_name: string;
    buyer_name: string;
    unread_count: number;
  };
  isFarmer: boolean;
  onOpenChat: () => void;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
}

const getStatusIcon = (status: OrderStatus) => {
  switch (status) {
    case 'pending':
      return <Clock className="h-4 w-4" />;
    case 'accepted':
    case 'confirmed':
    case 'completed':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'ready_for_delivery':
      return <Truck className="h-4 w-4" />;
    case 'rejected':
    case 'cancelled':
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Package className="h-4 w-4" />;
  }
};

export const OrderCard = ({ order, isFarmer, onOpenChat, onStatusChange }: OrderCardProps) => {
  const hasPhoto = order.listing_photos.length > 0;
  
  // Use stored totals if available, otherwise calculate from base values
  const subtotal = order.subtotal ?? (order.quantity * order.offered_price);
  const platformFeePercent = order.platform_fee_percent ?? 0;
  const platformFeeAmount = order.platform_fee_amount ?? 0;
  const totalAmount = order.total_amount ?? subtotal;
  const isFreeTrial = platformFeePercent === 0;

  // Determine if chat should be prominent
  const showPromotedChat = ['confirmed', 'ready_for_delivery', 'accepted'].includes(order.status);
  const isActiveOrder = ['accepted', 'confirmed', 'ready_for_delivery'].includes(order.status);

  return (
    <div 
      className={cn(
        "bg-card rounded-2xl border overflow-hidden transition-all duration-300 group",
        isActiveOrder 
          ? "border-primary/20 shadow-md hover:shadow-lg hover:border-primary/30" 
          : "border-border/50 shadow-sm hover:shadow-md"
      )}
    >
      <div className="flex flex-col lg:flex-row">
        {/* Image Section */}
        <div className="relative w-full lg:w-48 h-48 lg:h-auto bg-muted flex-shrink-0 overflow-hidden">
          {hasPhoto ? (
            <img 
              src={order.listing_photos[0]} 
              alt={order.listing_title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-muted to-muted/50">
              📦
            </div>
          )}
          {/* Status overlay on image */}
          <div className="absolute top-3 left-3">
            <Badge 
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium shadow-lg backdrop-blur-sm",
                getStatusColor(order.status)
              )}
            >
              {getStatusIcon(order.status)}
              {getStatusLabel(order.status)}
            </Badge>
          </div>
          {/* Unread badge on image */}
          {order.unread_count > 0 && (
            <div className="absolute top-3 right-3">
              <div className="bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-6 min-w-6 flex items-center justify-center px-2 shadow-lg animate-pulse">
                {order.unread_count > 9 ? '9+' : order.unread_count}
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 p-5 lg:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
            <div className="space-y-1">
              <Link 
                to={`/listing/${order.listing_id}`} 
                className="inline-flex items-center gap-2 font-semibold text-lg hover:text-primary transition-colors group/link"
              >
                {order.listing_title}
                <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all" />
              </Link>
              <p className="text-sm text-muted-foreground">
                {isFarmer ? (
                  <>From: <span className="font-medium text-foreground">{order.buyer_name}</span></>
                ) : (
                  <>Seller: <span className="font-medium text-foreground">{order.farmer_name}</span></>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">${formatCurrency(totalAmount)}</p>
              <p className="text-xs text-muted-foreground">
                {order.quantity} {order.listing_unit} × ${formatCurrency(order.offered_price)}
              </p>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {new Date(order.created_at).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
            {order.confirmed_at && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Confirmed {new Date(order.confirmed_at).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric'
                })}
              </div>
            )}
            {isFreeTrial && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                ✓ Free Plan
              </Badge>
            )}
          </div>

          {/* Fee Breakdown - Compact */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 mb-4">
            <span>
              Subtotal: <span className="font-medium text-foreground">${formatCurrency(subtotal)}</span>
            </span>
            <span className="text-border">|</span>
            <span>
              Platform Fee ({platformFeePercent}%): <span className="font-medium text-foreground">${formatCurrency(platformFeeAmount)}</span>
            </span>
          </div>

          {/* Actions Row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Chat Button - Prominent when confirmed */}
            <Button 
              variant={showPromotedChat ? "default" : "outline"}
              size="sm" 
              onClick={onOpenChat}
              className={cn(
                "relative",
                showPromotedChat && "bg-gradient-to-r from-primary to-primary/80 shadow-md"
              )}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {showPromotedChat ? 'Open Chat' : order.status === 'pending' ? 'Negotiate' : 'Chat'}
              {order.unread_count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                  {order.unread_count > 9 ? '9+' : order.unread_count}
                </span>
              )}
            </Button>

            {/* Status Actions */}
            <OrderStatusActions
              orderId={order.id}
              currentStatus={order.status}
              isSeller={isFarmer}
              listingId={order.listing_id}
              quantity={order.quantity}
              sellerId={order.farmer_id}
              totalAmount={order.total_amount}
              onStatusChange={(newStatus) => onStatusChange(order.id, newStatus)}
              onOpenChat={onOpenChat}
            />
          </div>

          {/* Delivery Status Section - only for buyers */}
          {!isFarmer && (
            <DeliveryStatusSection
              orderId={order.id}
              order={{
                id: order.id,
                listing_title: order.listing_title,
                listing_unit: order.listing_unit,
                quantity: order.quantity,
                farmer_id: order.farmer_id,
                status: order.status,
              }}
              isBuyer={!isFarmer}
            />
          )}
        </div>
      </div>

      {/* Active Order Indicator Bar */}
      {isActiveOrder && (
        <div className="h-1 bg-gradient-to-r from-primary via-secondary to-primary" />
      )}
    </div>
  );
};
