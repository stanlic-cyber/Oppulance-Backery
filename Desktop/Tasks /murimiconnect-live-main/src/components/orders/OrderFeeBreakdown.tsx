import { formatCurrency } from '@/lib/platformFee';

interface OrderFeeBreakdownProps {
  subtotal: number;
  platformFeePercent: number;
  platformFeeAmount: number;
  totalAmount: number;
  showTrialLabel?: boolean;
  className?: string;
}

export const OrderFeeBreakdown = ({
  subtotal,
  platformFeePercent,
  platformFeeAmount,
  totalAmount,
  showTrialLabel = true,
  className = '',
}: OrderFeeBreakdownProps) => {
  const isFreeTrial = platformFeePercent === 0;

  return (
    <div className={`bg-muted p-4 rounded-lg space-y-2 ${className}`}>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span>${formatCurrency(subtotal)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          Platform Fee ({platformFeePercent}%)
        </span>
        <span>${formatCurrency(platformFeeAmount)}</span>
      </div>
      <div className="border-t border-border pt-2 flex justify-between font-semibold">
        <span>Total</span>
        <span className="text-primary">${formatCurrency(totalAmount)}</span>
      </div>
      {showTrialLabel && (
        <p className="text-xs pt-1 text-center">
          {isFreeTrial ? (
            <span className="text-green-600 dark:text-green-400">
              ✓ Free Plan Active (0% platform fee)
            </span>
          ) : (
            <span className="text-muted-foreground">
              Platform fee applied (5%)
            </span>
          )}
        </p>
      )}
    </div>
  );
};
