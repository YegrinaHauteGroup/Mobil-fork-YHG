/**
 * Supabase 스키마에 대응하는 타입 정의.
 * supabase/migrations/0001_init.sql 의 테이블 구조와 일치한다.
 * @supabase/ssr 가 요구하는 GenericSchema 형태(Tables/Views/Functions/Enums/
 * CompositeTypes + 테이블별 Relationships)를 갖춰야 rpc() 인자 타입이 올바르게
 * 추론된다.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Role = "user" | "admin";
export type Permission = "view" | "edit";
export type TargetType = "document" | "file" | "code";
export type AuditAction =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "download";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          role: Role;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          role?: Role;
        };
        Update: {
          email?: string;
          display_name?: string | null;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          content: Json;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title?: string;
          content?: Json;
          is_public?: boolean;
        };
        Update: {
          title?: string;
          content?: Json;
          is_public?: boolean;
        };
        Relationships: [];
      };
      document_permissions: {
        Row: {
          id: string;
          document_id: string;
          user_id: string;
          permission: Permission;
          granted_by: string;
          granted_at: string;
        };
        Insert: {
          document_id: string;
          user_id: string;
          permission: Permission;
          granted_by: string;
        };
        Update: {
          permission?: Permission;
        };
        Relationships: [];
      };
      code_files: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          language: string;
          content: string;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name?: string;
          language?: string;
          content?: string;
          is_public?: boolean;
        };
        Update: {
          name?: string;
          language?: string;
          content?: string;
          is_public?: boolean;
        };
        Relationships: [];
      };
      code_file_permissions: {
        Row: {
          id: string;
          code_file_id: string;
          user_id: string;
          permission: Permission;
          granted_by: string;
          granted_at: string;
        };
        Insert: {
          code_file_id: string;
          user_id: string;
          permission: Permission;
          granted_by: string;
        };
        Update: {
          permission?: Permission;
        };
        Relationships: [];
      };
      mind_maps: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          data: Json;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title?: string;
          data?: Json;
          is_public?: boolean;
        };
        Update: {
          title?: string;
          data?: Json;
          is_public?: boolean;
        };
        Relationships: [];
      };
      mind_map_permissions: {
        Row: {
          id: string;
          mind_map_id: string;
          user_id: string;
          permission: Permission;
          granted_by: string;
          granted_at: string;
        };
        Insert: {
          mind_map_id: string;
          user_id: string;
          permission: Permission;
          granted_by: string;
        };
        Update: {
          permission?: Permission;
        };
        Relationships: [];
      };
      sheets: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          data: Json;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title?: string;
          data?: Json;
          is_public?: boolean;
        };
        Update: {
          title?: string;
          data?: Json;
          is_public?: boolean;
        };
        Relationships: [];
      };
      sheet_permissions: {
        Row: {
          id: string;
          sheet_id: string;
          user_id: string;
          permission: Permission;
          granted_by: string;
          granted_at: string;
        };
        Insert: {
          sheet_id: string;
          user_id: string;
          permission: Permission;
          granted_by: string;
        };
        Update: {
          permission?: Permission;
        };
        Relationships: [];
      };
      files: {
        Row: {
          id: string;
          owner_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string | null;
          size_bytes: number | null;
          is_public: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          storage_path: string;
          file_name: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          is_public?: boolean;
        };
        Update: {
          file_name?: string;
          is_public?: boolean;
        };
        Relationships: [];
      };
      file_permissions: {
        Row: {
          id: string;
          file_id: string;
          user_id: string;
          permission: Permission;
          granted_by: string;
          granted_at: string;
        };
        Insert: {
          file_id: string;
          user_id: string;
          permission: Permission;
          granted_by: string;
        };
        Update: {
          permission?: Permission;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          target_type: TargetType;
          target_id: string;
          action: AuditAction;
          created_at: string;
        };
        Insert: {
          user_id?: string | null;
          target_type: TargetType;
          target_id: string;
          action: AuditAction;
        };
        Update: {
          user_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      redeem_admin_code: {
        Args: { p_code: string };
        Returns: undefined;
      };
      generate_admin_code: {
        Args: { p_expires_at: string | null };
        Returns: string;
      };
      my_storage_usage: {
        Args: Record<string, never>;
        Returns: { bucket_id: string; bytes: number; file_count: number }[];
      };
      platform_storage_usage: {
        Args: Record<string, never>;
        Returns: { bucket_id: string; bytes: number; file_count: number }[];
      };
      my_content_breakdown: {
        Args: Record<string, never>;
        Returns: { category: string; bytes: number; item_count: number }[];
      };
      platform_content_breakdown: {
        Args: Record<string, never>;
        Returns: { category: string; bytes: number; item_count: number }[];
      };
      admin_user_overview: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          email: string;
          display_name: string | null;
          role: Role;
          created_at: string;
          documents_count: number;
          files_count: number;
          code_count: number;
          sheets_count: number;
          maps_count: number;
          storage_bytes: number;
        }[];
      };
      admin_orphaned_media: {
        Args: Record<string, never>;
        Returns: { name: string; bytes: number; created_at: string }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
