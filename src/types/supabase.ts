export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      leagues: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      seasons: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      teams: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      players: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      matches: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      match_events: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
    };
  };
}
