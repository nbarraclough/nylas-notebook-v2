
export type StorageConfig = {
  id: string;
  created_at: string;
  updated_at: string;
  bucket_name: string;
  bucket_path: string;
  max_file_size_mb: number;
  allowed_mime_types: string[];
  user_id: string;
  organization_id: string | null;
};

export type StorageConfigInsert = {
  id?: string;
  created_at?: string;
  updated_at?: string;
  bucket_name: string;
  bucket_path: string;
  max_file_size_mb?: number;
  allowed_mime_types?: string[];
  user_id: string;
  organization_id?: string | null;
};

export type StorageConfigUpdate = Partial<StorageConfigInsert>;

