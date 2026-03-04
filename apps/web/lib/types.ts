// apps\web\lib\types.ts
export enum BookingStatus {
  PENDING      = 'pending',
  DEPOSIT_PAID = 'deposit_paid',
  CONFIRMED    = 'confirmed',
  IN_PROGRESS  = 'in_progress',
  COMPLETED    = 'completed',
  CANCELLED    = 'cancelled',
  NO_SHOW      = 'no_show',
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]:      'En attente',
  [BookingStatus.DEPOSIT_PAID]: 'Acompte payé',
  [BookingStatus.CONFIRMED]:    'Confirmé',
  [BookingStatus.IN_PROGRESS]:  'En cours',
  [BookingStatus.COMPLETED]:    'Terminé',
  [BookingStatus.CANCELLED]:    'Annulé',
  [BookingStatus.NO_SHOW]:      'Absent',
};

export const BOOKING_STATUS_COLORS: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]:      'bg-gray-100 text-gray-700',
  [BookingStatus.DEPOSIT_PAID]: 'bg-blue-100 text-blue-700',
  [BookingStatus.CONFIRMED]:    'bg-green-100 text-green-700',
  [BookingStatus.IN_PROGRESS]:  'bg-yellow-100 text-yellow-700',
  [BookingStatus.COMPLETED]:    'bg-emerald-100 text-emerald-700',
  [BookingStatus.CANCELLED]:    'bg-red-100 text-red-700',
  [BookingStatus.NO_SHOW]:      'bg-orange-100 text-orange-700',
};

export const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
export const DAY_NAMES_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];