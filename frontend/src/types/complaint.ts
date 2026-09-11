export interface ComplaintSummary {
  id: number;
  complaintNumber: string;
  title: string;
  description?: string;
  source: string;
  priority: string;
  status: string;
  category?: string;
  equipment?: string;
  equipmentReference?: string;
  location?: string;
  department?: string;
  reporter?: string;
  resolvedBy?: string;
  group?: string;
  confidence?: number;
  createdAt: string;
  resolvedAt?: string;
}

export interface ComplaintEvent {
  eventType: string;
  oldValue?: string;
  newValue?: string;
  description?: string;
  performedBy?: string;
  createdAt: string;
}

export interface ComplaintDetail extends ComplaintSummary {
  categoryId?: number;
  equipmentId?: number;
  locationId?: number;
  imageUrls?: string[];
  events?: ComplaintEvent[];
}

export interface ReferenceOption {
  id: number;
  name: string;
  active: boolean;
}

export interface EquipmentOption extends ReferenceOption {
  equipmentCode: string;
}

export interface CategoryRecord extends ReferenceOption {
  description?: string | null;
}

export interface CategoryRequest {
  name: string;
  description: string | null;
  active: boolean;
}

export interface EquipmentRecord extends ReferenceOption {
  equipmentCode: string;
  type?: string | null;
}

export interface EquipmentRequest {
  equipmentCode: string;
  name: string;
  type: string | null;
  manufacturer: string | null;
  model: string | null;
  locationId: number | null;
  department: string | null;
  active: boolean;
}

/** Sent as-is on save - null on categoryId/equipmentId/locationId means "unassign". */
export interface ComplaintUpdatePayload {
  title: string;
  categoryId: number | null;
  equipmentId: number | null;
  equipmentReference: string | null;
  locationId: number | null;
  priority: string;
  status: string;
}
