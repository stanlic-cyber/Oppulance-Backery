// Order status types and utilities
export type OrderStatus = 
  | 'pending' 
  | 'accepted' 
  | 'rejected' 
  | 'negotiating' 
  | 'confirmed' 
  | 'ready_for_delivery'
  | 'completed' 
  | 'cancelled';

// Status transition rules
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['accepted', 'rejected', 'negotiating', 'cancelled'],
  negotiating: ['accepted', 'rejected', 'cancelled'],
  accepted: ['confirmed', 'cancelled'],
  rejected: [],
  confirmed: ['ready_for_delivery', 'cancelled'],
  ready_for_delivery: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

// Who can perform status transitions
export const STATUS_TRANSITION_ROLES: Record<string, 'seller' | 'buyer' | 'both'> = {
  'pending->accepted': 'seller',
  'pending->rejected': 'seller',
  'pending->negotiating': 'both',
  'pending->cancelled': 'buyer',
  'negotiating->accepted': 'seller',
  'negotiating->rejected': 'seller',
  'negotiating->cancelled': 'buyer',
  'accepted->confirmed': 'both',
  'accepted->cancelled': 'both',
  'confirmed->ready_for_delivery': 'seller',
  'confirmed->cancelled': 'both',
  'ready_for_delivery->completed': 'buyer',
  'ready_for_delivery->cancelled': 'both',
};

export function canTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
  isSeller: boolean
): boolean {
  const allowedStatuses = ORDER_STATUS_TRANSITIONS[currentStatus];
  if (!allowedStatuses.includes(newStatus)) {
    return false;
  }

  const transitionKey = `${currentStatus}->${newStatus}`;
  const requiredRole = STATUS_TRANSITION_ROLES[transitionKey];
  
  if (!requiredRole) return false;
  if (requiredRole === 'both') return true;
  if (requiredRole === 'seller' && isSeller) return true;
  if (requiredRole === 'buyer' && !isSeller) return true;
  
  return false;
}

export function getStatusColor(status: OrderStatus): string {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'accepted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'negotiating': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'ready_for_delivery': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
    case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400';
  }
}

export function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'pending': return 'Pending';
    case 'accepted': return 'Accepted';
    case 'rejected': return 'Rejected';
    case 'negotiating': return 'Negotiating';
    case 'confirmed': return 'Confirmed';
    case 'ready_for_delivery': return 'Ready for Delivery';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
}

// Timestamp field for each status
export function getTimestampField(status: OrderStatus): string | null {
  switch (status) {
    case 'confirmed': return 'confirmed_at';
    case 'completed': return 'completed_at';
    case 'cancelled': return 'cancelled_at';
    default: return null;
  }
}
