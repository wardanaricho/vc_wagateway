export type WebhookEvent =
  | "message.received"
  | "message.sent"
  | "session.connected"
  | "session.disconnected";

export interface CreateWebhookBody {
  url: string;
  events: WebhookEvent[];
  secret?: string;
  isActive?: boolean;
}

export interface UpdateWebhookBody {
  url?: string;
  events?: WebhookEvent[];
  secret?: string;
  isActive?: boolean;
}

export interface WebhookPayload {
  event: WebhookEvent;
  sessionId: string;
  timestamp: string;
  data: Record<string, unknown>;
}
