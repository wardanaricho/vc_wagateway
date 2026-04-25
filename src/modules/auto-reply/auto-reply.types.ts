export type MatchType =
  | "contains"
  | "exact"
  | "startsWith"
  | "endsWith"
  | "regex";

export interface CreateAutoReplyBody {
  sessionId?: string; // null = berlaku untuk semua session milik user
  keyword: string;
  matchType: MatchType;
  response: string;
  isActive?: boolean;
}

export interface UpdateAutoReplyBody {
  keyword?: string;
  matchType?: MatchType;
  response?: string;
  isActive?: boolean;
}
