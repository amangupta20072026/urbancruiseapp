export type Trend = 'up' | 'down';

export type StatMetric = {
  key: 'trips' | 'customers' | 'bookings' | 'revenue';
  label: string;
  value: string; // formatted, e.g. "128" or "₹98,450"
  deltaPct: number; // 12.5
  trend: Trend;
  compareLabel: string; // "vs yesterday"
};

export type RevenuePoint = { label: string; value: number }; // Mon..Sun

export type RevenueSeries = {
  total: string; // "₹98,450"
  deltaPct: number;
  trend: Trend;
  compareLabel: string; // "vs last week"
  range: 'This Week' | 'This Month';
  points: RevenuePoint[];
};

export type BookingStatus = 'Completed' | 'Ongoing' | 'Scheduled' | 'Cancelled';

export type RecentBooking = {
  id: string; // "UC12345"
  customerName: string;
  avatarUri?: string;
  time: string; // "10:30 AM"
  pickup: string;
  drop: string;
  fare: string; // "₹1,250"
  status: BookingStatus;
};

export type DashboardData = {
  greeting: { name: string; dateISO: string };
  stats: StatMetric[];
  revenue: RevenueSeries;
  recentBookings: RecentBooking[];
};
