import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CSSProperties } from "react";

export type Settings = {
  business_name: string;
  game_title: string;
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
  discount_percent: number;
  min_score: number;
  coupon_days: number;
};

export const DEFAULT_SETTINGS: Settings = {
  business_name: "Açaí do Bairro",
  game_title: "Monte o seu Açaí",
  primary_color: "#5b1f8a",
  secondary_color: "#7ed321",
  logo_url: null,
  discount_percent: 10,
  min_score: 150,
  coupon_days: 7,
};

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async (): Promise<Settings> => {
    const { data, error } = await supabase.from("settings").select("*").eq("id", 1).single();
    if (error || !data) return DEFAULT_SETTINGS;
    return data as Settings;
  },
});

/** Business colors flow into the design tokens so every client uses its own palette. */
export function brandStyle(s: Settings): CSSProperties {
  return { ["--brand" as string]: s.primary_color, ["--brand-2" as string]: s.secondary_color };
}
