export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  graphql_public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string;
          id: number;
          match_id: number | null;
          type: Database["public"]["Enums"]["analytics_event_type_enum"];
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: number;
          match_id?: number | null;
          type: Database["public"]["Enums"]["analytics_event_type_enum"];
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: number;
          match_id?: number | null;
          type?: Database["public"]["Enums"]["analytics_event_type_enum"];
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "analytics_events_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      dic_lookup_labels: {
        Row: {
          code: string;
          domain: string;
          id: number;
          label: string;
        };
        Insert: {
          code: string;
          domain: string;
          id?: number;
          label: string;
        };
        Update: {
          code?: string;
          domain?: string;
          id?: number;
          label?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          coach_notes: string | null;
          created_at: string;
          ended_at: string | null;
          first_server_first_set: Database["public"]["Enums"]["side_enum"];
          generate_ai_summary: boolean;
          golden_set_enabled: boolean;
          id: number;
          max_sets: number;
          opponent_name: string;
          player_name: string;
          sets_won_opponent: number;
          sets_won_player: number;
          started_at: string;
          status: Database["public"]["Enums"]["match_status_enum"];
          user_id: string;
        };
        Insert: {
          coach_notes?: string | null;
          created_at?: string;
          ended_at?: string | null;
          first_server_first_set: Database["public"]["Enums"]["side_enum"];
          generate_ai_summary: boolean;
          golden_set_enabled: boolean;
          id?: number;
          max_sets: number;
          opponent_name: string;
          player_name: string;
          sets_won_opponent: number;
          sets_won_player: number;
          started_at?: string;
          status: Database["public"]["Enums"]["match_status_enum"];
          user_id: string;
        };
        Update: {
          coach_notes?: string | null;
          created_at?: string;
          ended_at?: string | null;
          first_server_first_set?: Database["public"]["Enums"]["side_enum"];
          generate_ai_summary?: boolean;
          golden_set_enabled?: boolean;
          id?: number;
          max_sets?: number;
          opponent_name?: string;
          player_name?: string;
          sets_won_opponent?: number;
          sets_won_player?: number;
          started_at?: string;
          status?: Database["public"]["Enums"]["match_status_enum"];
          user_id?: string;
        };
        Relationships: [];
      };
      matches_ai_reports: {
        Row: {
          ai_error: string | null;
          ai_generated_at: string | null;
          ai_recommendations: string | null;
          ai_status: Database["public"]["Enums"]["ai_status_enum"];
          ai_summary: string | null;
          created_at: string;
          id: number;
          match_id: number;
          user_id: string;
        };
        Insert: {
          ai_error?: string | null;
          ai_generated_at?: string | null;
          ai_recommendations?: string | null;
          ai_status: Database["public"]["Enums"]["ai_status_enum"];
          ai_summary?: string | null;
          created_at?: string;
          id?: number;
          match_id: number;
          user_id: string;
        };
        Update: {
          ai_error?: string | null;
          ai_generated_at?: string | null;
          ai_recommendations?: string | null;
          ai_status?: Database["public"]["Enums"]["ai_status_enum"];
          ai_summary?: string | null;
          created_at?: string;
          id?: number;
          match_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matches_ai_reports_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: true;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      matches_public_share: {
        Row: {
          created_at: string;
          id: number;
          match_id: number;
          token: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          match_id: number;
          token: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          match_id?: number;
          token?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matches_public_share_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: true;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      point_tags: {
        Row: {
          created_at: string;
          point_id: number;
          tag_id: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          point_id: number;
          tag_id: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          point_id?: number;
          tag_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "point_tags_point_id_fkey";
            columns: ["point_id"];
            isOneToOne: false;
            referencedRelation: "points";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "point_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      points: {
        Row: {
          created_at: string;
          id: number;
          scored_by: Database["public"]["Enums"]["side_enum"];
          sequence_in_set: number;
          served_by: Database["public"]["Enums"]["side_enum"];
          set_id: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          scored_by: Database["public"]["Enums"]["side_enum"];
          sequence_in_set: number;
          served_by: Database["public"]["Enums"]["side_enum"];
          set_id: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          scored_by?: Database["public"]["Enums"]["side_enum"];
          sequence_in_set?: number;
          served_by?: Database["public"]["Enums"]["side_enum"];
          set_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "points_set_id_fkey";
            columns: ["set_id"];
            isOneToOne: false;
            referencedRelation: "sets";
            referencedColumns: ["id"];
          },
        ];
      };
      sets: {
        Row: {
          coach_notes: string | null;
          created_at: string;
          finished_at: string | null;
          id: number;
          is_finished: boolean;
          is_golden: boolean;
          match_id: number;
          sequence_in_match: number;
          set_score_opponent: number;
          set_score_player: number;
          user_id: string;
          winner: Database["public"]["Enums"]["side_enum"] | null;
        };
        Insert: {
          coach_notes?: string | null;
          created_at?: string;
          finished_at?: string | null;
          id?: number;
          is_finished: boolean;
          is_golden: boolean;
          match_id: number;
          sequence_in_match: number;
          set_score_opponent: number;
          set_score_player: number;
          user_id: string;
          winner?: Database["public"]["Enums"]["side_enum"] | null;
        };
        Update: {
          coach_notes?: string | null;
          created_at?: string;
          finished_at?: string | null;
          id?: number;
          is_finished?: boolean;
          is_golden?: boolean;
          match_id?: number;
          sequence_in_match?: number;
          set_score_opponent?: number;
          set_score_player?: number;
          user_id?: string;
          winner?: Database["public"]["Enums"]["side_enum"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "sets_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      tags: {
        Row: {
          created_at: string;
          id: number;
          is_system: boolean;
          name: string;
          order_in_list: number;
        };
        Insert: {
          created_at?: string;
          id?: number;
          is_system: boolean;
          name: string;
          order_in_list: number;
        };
        Update: {
          created_at?: string;
          id?: number;
          is_system?: boolean;
          name?: string;
          order_in_list?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      ai_status_enum: "pending" | "success" | "error";
      analytics_event_type_enum: "login" | "match_created" | "match_finished";
      match_status_enum: "in_progress" | "finished";
      side_enum: "player" | "opponent";
    };
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ai_status_enum: ["pending", "success", "error"],
      analytics_event_type_enum: ["login", "match_created", "match_finished"],
      match_status_enum: ["in_progress", "finished"],
      side_enum: ["player", "opponent"],
    },
  },
} as const;
