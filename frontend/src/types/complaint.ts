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
  reporter?: string;
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
  imageUrls?: string[];
  events?: ComplaintEvent[];
}
