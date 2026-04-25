export interface SendMessageBody {
  to: string; // nomor tujuan, contoh: "6281234567890"
  message: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  message?: string;
}
