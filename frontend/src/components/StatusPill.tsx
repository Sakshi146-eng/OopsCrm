import type { CustomerStatus, ChallanStatus } from '../types';

interface StatusPillProps {
  status: CustomerStatus | ChallanStatus | string;
}

const STATUS_MAP: Record<string, string> = {
  // Customer statuses
  ACTIVE: 'badge-green',
  LEAD: 'badge-yellow',
  INACTIVE: 'badge-red',
  // Challan statuses
  CONFIRMED: 'badge-green',
  DRAFT: 'badge-yellow',
  CANCELLED: 'badge-red',
  // Customer types
  WHOLESALE: 'badge-blue',
  RETAIL: 'badge-slate',
  DISTRIBUTOR: 'badge-blue',
  // Movement types
  IN: 'badge-green',
  OUT: 'badge-red',
};

const STATUS_DOTS: Record<string, string> = {
  ACTIVE: '🟢', LEAD: '🟡', INACTIVE: '🔴',
  CONFIRMED: '🟢', DRAFT: '🟡', CANCELLED: '🔴',
  WHOLESALE: '🔵', RETAIL: '⚪', DISTRIBUTOR: '🔵',
  IN: '🟢', OUT: '🔴',
};

export default function StatusPill({ status }: StatusPillProps) {
  const cls = STATUS_MAP[status] || 'badge-slate';
  return (
    <span className={cls}>
      <span className="text-[8px]">{STATUS_DOTS[status] || '⚪'}</span>
      {status}
    </span>
  );
}
