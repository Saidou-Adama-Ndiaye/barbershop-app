// apps\web\lib\coiffeur\api.ts
import api from '@/lib/api';
import { BookingStatus } from '@/lib/types';


// ─── Types ────────────────────────────────────────────────
export interface DashboardStats {
  today: {
    count:    number;
    next:     CoiffeurBooking | null;
    bookings: CoiffeurBooking[];
  };
  week: {
    count:   number;
    revenue: number;
    bookings: CoiffeurBooking[];
  };
  month: {
    revenue: number;
    count:   number;
  };
  uniqueClients: number;
}

export interface CoiffeurBooking {
  id:            string;
  bookingNumber: string;
  clientId:      string;
  staffId:       string;
  bookedAt:      string;
  endAt:         string;
  status:        BookingStatus;
  totalPrice:    number;
  depositPaid:   number;
  notes:         string | null;
  staffNotes:    string | null;
  service: {
    id:          string;
    name:        string;
    durationMin: number;
    price:       number;
  };
  client?: {
    id:        string;
    firstName: string;
    lastName:  string;
    email:     string;
    phone?:    string;
  };
}

export interface ClientSummary {
  clientId:    string;
  firstName:   string;
  lastName:    string;
  email:       string;
  totalRdv:    number;
  lastRdv:     string;
  isRecurrent: boolean;
}

export interface StaffAvailability {
  id:        string;
  staffId:   string;
  dayOfWeek: number;
  startTime: string;
  endTime:   string;
  isActive:  boolean;
}

export interface MonthlyStats {
  month:   string;
  revenue: number;
  count:   number;
}

export interface CoiffeurStats {
  monthly:    MonthlyStats[];
  byStatus:   Record<string, number>;
  noShowRate: number;
  topClients: ClientSummary[];
}

// ─── Dashboard ────────────────────────────────────────────
export async function getDashboard(): Promise<DashboardStats> {
  const { data } = await api.get('/coiffeur/dashboard');
  return data;
}

// ─── RDV ──────────────────────────────────────────────────
export async function getCoiffeurBookings(
  filter: 'today' | 'week' | 'month' | 'all' = 'today',
): Promise<CoiffeurBooking[]> {
  const { data } = await api.get('/coiffeur/rdv', { params: { filter } });
  return data;
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
): Promise<CoiffeurBooking> {
  const { data } = await api.patch(`/bookings/${id}/status`, { status });
  return data;
}

export async function updateBookingNotes(
  id: string,
  staffNotes: string,
): Promise<CoiffeurBooking> {
  const { data } = await api.patch(`/bookings/${id}/notes`, { staffNotes });
  return data;
}

// ─── Clients ──────────────────────────────────────────────
export async function getClients(): Promise<ClientSummary[]> {
  const { data } = await api.get('/coiffeur/clients');
  return data;
}

export async function getClientHistory(clientId: string): Promise<{
  client:   Partial<ClientSummary>;
  bookings: CoiffeurBooking[];
}> {
  const { data } = await api.get(`/coiffeur/clients/${clientId}/history`);
  return data;
}

// ─── Stats ────────────────────────────────────────────────
export async function getCoiffeurStats(): Promise<CoiffeurStats> {
  const { data } = await api.get('/coiffeur/stats');
  return data;
}

// ─── Disponibilités ───────────────────────────────────────
export async function getAvailability(): Promise<StaffAvailability[]> {
  const { data } = await api.get('/staff/availability');
  return data;
}

export async function createAvailability(data: {
  dayOfWeek: number;
  startTime: string;
  endTime:   string;
  isActive?: boolean;
}): Promise<StaffAvailability> {
  const { data: res } = await api.post('/staff/availability', data);
  return res;
}

export async function updateAvailability(
  id: string,
  data: { startTime?: string; endTime?: string; isActive?: boolean },
): Promise<StaffAvailability> {
  const { data: res } = await api.patch(`/staff/availability/${id}`, data);
  return res;
}

export async function deleteAvailability(id: string): Promise<void> {
  await api.delete(`/staff/availability/${id}`);
}