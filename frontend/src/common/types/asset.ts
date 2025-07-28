export interface Asset {
  id: string;
  asset_code: string;
  inventory_number?: string;
  serial_number?: string;
  name: string;
  description?: string;
  location?: string;
  location_id?: string;
  room?: string;
  department?: string;
  department_id?: string;
  owner?: string;
  owner_id?: string;
  status?: string;
  status_color?: string;
  image_url?: string | null;
  acquired_date?: string;
  created_at?: string;
  updated_at?: string;
  has_pending_audit?: boolean;
  pending_status?: string | null;
  has_pending_transfer?: boolean;
} 