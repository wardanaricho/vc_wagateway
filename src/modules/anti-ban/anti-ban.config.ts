export interface AntiBanConfig {
  // delay antar pesan dalam ms (min - max)
  minDelayMs: number;
  maxDelayMs: number;

  // batas pesan per jam per session
  maxMessagesPerHour: number;

  // batas pesan per hari per session
  maxMessagesPerDay: number;

  // batas pesan massal sekaligus
  maxBurstMessages: number;
}

// default config — bisa di-override per session nanti
export const DEFAULT_ANTI_BAN_CONFIG: AntiBanConfig = {
  minDelayMs: 1000, // minimal 1 detik
  maxDelayMs: 4000, // maksimal 4 detik
  maxMessagesPerHour: 60, // 60 pesan/jam
  maxMessagesPerDay: 300, // 300 pesan/hari
  maxBurstMessages: 5, // max 5 pesan sekaligus
};
