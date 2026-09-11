// Platform fee calculation utilities

const FREE_TRIAL_DAYS = 30;
const PLATFORM_FEE_PERCENT_AFTER_TRIAL = 5;

/**
 * Check if a user is still in their free trial period
 * @param userCreatedAt - The user's signup timestamp
 * @returns true if still in trial, false otherwise
 */
export const isInFreeTrial = (userCreatedAt: string | Date): boolean => {
  const createdDate = new Date(userCreatedAt);
  const now = new Date();
  const diffMs = now.getTime() - createdDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays < FREE_TRIAL_DAYS;
};

/**
 * Get the number of days remaining in free trial
 * @param userCreatedAt - The user's signup timestamp
 * @returns number of days remaining (0 if trial expired)
 */
export const getTrialDaysRemaining = (userCreatedAt: string | Date): number => {
  const createdDate = new Date(userCreatedAt);
  const now = new Date();
  const diffMs = now.getTime() - createdDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const remaining = FREE_TRIAL_DAYS - diffDays;
  return Math.max(0, Math.ceil(remaining));
};

/**
 * Get the platform fee percentage based on trial status
 * @param userCreatedAt - The user's signup timestamp
 * @returns 0 if in trial, 5 otherwise
 */
export const getPlatformFeePercent = (userCreatedAt: string | Date): number => {
  return isInFreeTrial(userCreatedAt) ? 0 : PLATFORM_FEE_PERCENT_AFTER_TRIAL;
};

/**
 * Round a number to 2 decimal places for currency
 * @param value - The number to round
 * @returns Rounded value
 */
export const roundCurrency = (value: number): number => {
  return Math.round(value * 100) / 100;
};

/**
 * Calculate order totals including platform fee
 * @param quantity - The quantity ordered
 * @param pricePerUnit - The price per unit
 * @param userCreatedAt - The user's signup timestamp (to determine fee)
 * @returns Object with subtotal, platform_fee_percent, platform_fee_amount, total_amount
 */
export const calculateOrderTotals = (
  quantity: number,
  pricePerUnit: number,
  userCreatedAt: string | Date
): {
  subtotal: number;
  platform_fee_percent: number;
  platform_fee_amount: number;
  total_amount: number;
} => {
  const subtotal = roundCurrency(quantity * pricePerUnit);
  const platform_fee_percent = getPlatformFeePercent(userCreatedAt);
  const platform_fee_amount = roundCurrency(subtotal * (platform_fee_percent / 100));
  const total_amount = roundCurrency(subtotal + platform_fee_amount);

  return {
    subtotal,
    platform_fee_percent,
    platform_fee_amount,
    total_amount,
  };
};

/**
 * Format currency value to 2 decimal places
 * @param value - The number to format
 * @returns Formatted string
 */
export const formatCurrency = (value: number): string => {
  return value.toFixed(2);
};

/**
 * Validate order input before submission
 * @param quantity - The quantity ordered
 * @param pricePerUnit - The price per unit
 * @param maxQuantity - Maximum available quantity
 * @returns Object with isValid and error message
 */
export const validateOrderInput = (
  quantity: number,
  pricePerUnit: number,
  maxQuantity: number
): { isValid: boolean; error?: string } => {
  if (quantity < 1) {
    return { isValid: false, error: 'Quantity must be at least 1' };
  }
  if (quantity > maxQuantity) {
    return { isValid: false, error: `Quantity cannot exceed ${maxQuantity}` };
  }
  if (pricePerUnit <= 0) {
    return { isValid: false, error: 'Price must be greater than 0' };
  }
  const subtotal = quantity * pricePerUnit;
  if (subtotal <= 0) {
    return { isValid: false, error: 'Order total must be greater than 0' };
  }
  return { isValid: true };
};

/**
 * Validate listing input before submission
 * @param title - Product title
 * @param pricePerUnit - Price per unit
 * @param quantity - Stock quantity
 * @returns Object with isValid and error message
 */
export const validateListingInput = (
  title: string,
  pricePerUnit: number,
  quantity: number
): { isValid: boolean; error?: string } => {
  if (!title || title.trim().length === 0) {
    return { isValid: false, error: 'Product name is required' };
  }
  if (pricePerUnit <= 0) {
    return { isValid: false, error: 'Price must be greater than 0' };
  }
  if (quantity < 1) {
    return { isValid: false, error: 'Quantity must be at least 1' };
  }
  return { isValid: true };
};
