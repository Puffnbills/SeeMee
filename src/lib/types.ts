export type UserRole = "viewer" | "creator" | "moderator" | "administrator";
export type StreamStatus = "Live" | "Ended" | "Archived";
export type ModerationStatus = "active" | "suspended";
export type WalletType = "Purchase" | "Gift Sent" | "Gift Received" | "Refund";
export type NotificationType =
  | "New Follower"
  | "Live Alert"
  | "Gift Received"
  | "Moderator Action"
  | "Announcement";
export type ReportReason = "Spam" | "Harassment" | "Violence" | "Copyright";
export type ReportStatus = "Open" | "Under Review" | "Resolved" | "Rejected";

export interface User {
  id: string;
  username: string;
  display_name: string;
  email: string;
  avatar: string;
  bio: string;
  verified: boolean;
  coin_balance: number;
  followers_count: number;
  following_count: number;
  total_streams: number;
  total_views: number;
  total_revenue: number;
  stripe_customer_id: string | null;
  content_filter_enabled: boolean;
  role: UserRole;
  created_date: string;
  banned: boolean;
  warning_count: number;
}

export interface Stream {
  id: string;
  title: string;
  description: string;
  category: string;
  creator: string;
  status: StreamStatus;
  stream_room_id: string;
  thumbnail: string;
  viewer_count: number;
  peak_viewers: number;
  total_watch_time: number;
  replay_url: string | null;
  content_rating: string;
  sensitive_content_warning: boolean;
  includes_nudity: boolean;
  sexual_content: boolean;
  language: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  tags: string[];
  moderation_status: ModerationStatus;
  ingest_url: string | null;
  cloudflare_input_id: string | null;
  started_at: string;
  ended_at: string | null;
}

export interface ChatMessage {
  id: string;
  stream: string;
  sender: string;
  message: string;
  created_at: string;
  removed: boolean;
}

export interface Follow {
  id: string;
  follower: string;
  creator: string;
  created_at: string;
}

export interface Gift {
  id: string;
  name: string;
  icon: string;
  coin_cost: number;
  animation_url: string;
}

export interface GiftTransaction {
  id: string;
  sender: string;
  receiver: string;
  stream: string;
  gift: string;
  coins_spent: number;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  user: string;
  transaction_type: WalletType;
  coins: number;
  amount: number | null;
  external_id: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  recipient: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  link: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  reporter: string;
  reported_user: string | null;
  reported_stream: string | null;
  reported_message: string | null;
  reason: ReportReason;
  status: ReportStatus;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  active_streams: number;
}

export interface ContentRating {
  id: string;
  name: string;
  minimum_age: number;
  description: string;
}

export interface Database {
  users: User[];
  streams: Stream[];
  messages: ChatMessage[];
  follows: Follow[];
  gifts: Gift[];
  giftTransactions: GiftTransaction[];
  walletTransactions: WalletTransaction[];
  notifications: Notification[];
  reports: Report[];
  categories: Category[];
  contentRatings: ContentRating[];
}

export type PublicUser = Pick<
  User,
  | "id"
  | "username"
  | "display_name"
  | "avatar"
  | "bio"
  | "verified"
  | "followers_count"
  | "following_count"
  | "total_streams"
  | "total_views"
  | "created_date"
  | "role"
>;

export interface PublicMessage {
  id: string;
  message: string;
  created_at: string;
  removed: boolean;
  sender: Pick<User, "id" | "username" | "display_name" | "avatar">;
}

export interface PublicGiftEvent {
  id: string;
  gift_name: string;
  icon: string;
  animation_url: string;
  sender_name: string;
  created_at: string;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

export function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}
