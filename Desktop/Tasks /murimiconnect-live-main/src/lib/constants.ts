// Zimbabwe provinces and constants for Murimi Connect

export const ZIMBABWE_PROVINCES = [
  'Bulawayo',
  'Harare',
  'Manicaland',
  'Mashonaland Central',
  'Mashonaland East',
  'Mashonaland West',
  'Masvingo',
  'Matabeleland North',
  'Matabeleland South',
  'Midlands',
] as const;

export type ZimbabweProvince = typeof ZIMBABWE_PROVINCES[number];

export const PRODUCE_CATEGORIES = [
  { id: 'vegetables', icon: '🥬' },
  { id: 'fruits', icon: '🍎' },
  { id: 'grains', icon: '🌾' },
  { id: 'livestock', icon: '🐄' },
  { id: 'dairy', icon: '🥛' },
  { id: 'poultry', icon: '🐔' },
  { id: 'tubers', icon: '🥔' },
  { id: 'legumes', icon: '🫘' },
  { id: 'herbs', icon: '🌿' },
  { id: 'other', icon: '📦' },
] as const;

export const UNITS = [
  'kg',
  'g',
  'tonnes',
  'bags',
  'crates',
  'bunches',
  'heads',
  'litres',
  'pieces',
  'dozens',
] as const;

export const VEHICLE_TYPES = [
  { id: 'truck_small', label: 'Small Truck (1-3 tonnes)', icon: '🚛' },
  { id: 'truck_medium', label: 'Medium Truck (3-8 tonnes)', icon: '🚚' },
  { id: 'truck_large', label: 'Large Truck (8+ tonnes)', icon: '🚛' },
  { id: 'pickup', label: 'Pickup / Bakkie', icon: '🛻' },
  { id: 'van', label: 'Van', icon: '🚐' },
  { id: 'trailer', label: 'Trailer', icon: '🚛' },
  { id: 'other', label: 'Other', icon: '🚗' },
] as const;

export const DELIVERY_STATUSES = [
  'open',
  'assigned', 
  'pickup_confirmed',
  'in_transit',
  'delivered',
  'completed',
  'cancelled',
  'failed',
] as const;

export type DeliveryStatus = typeof DELIVERY_STATUSES[number];

export const PLATFORM_FEE_USD = 5;

export const SUPPORT_PHONE = '+263 778 229 3138';

export const SUPPORT_CATEGORIES = [
  'Account Issues',
  'Listing Problems',
  'Order Disputes',
  'Payment Questions',
  'Delivery Issues',
  'Technical Issues',
  'Other',
] as const;

export const PAYMENT_INSTRUCTIONS = {
  ecocash: '0778 229 313',
  onemoney: '0718 229 313',
  bank: 'FBC Bank - Murimi Connect - 123456789',
} as const;
