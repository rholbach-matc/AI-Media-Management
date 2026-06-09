export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
}

export interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
  user: User;
}

export interface ApiErrorResponse {
  detail?: string;
}

export type NodeType = 'base_image' | 'edit' | 'animation';
export type PromptType = 'base' | 'edit' | 'extension';
export type GenerationMode = 'speed' | 'quality';
export type ModerationOutcome = 'passed' | 'blocked' | 'not_applicable';
export type SortBy = 'created_at' | 'rating' | 'file_size' | 'updated_at';
export type SortOrder = 'asc' | 'desc';

export interface Prompt {
  id: string;
  output_node_id: string;
  prompt_text: string;
  prompt_type: PromptType;
  extension_order: number | null;
  parent_prompt_id: string | null;
  technique_tags: string[];
  includes_spicy_header: boolean;
  dodge_phrases_used: string[] | null;
  created_at: string;
}

export interface OutputSummary {
  id: string;
  node_type: NodeType;
  file_path: string;
  thumbnail_path: string | null;
  animated_thumbnail_path: string | null;
  width: number;
  height: number;
  rating: number | null;
  is_favorite: boolean;
}

export interface Tag {
  id: string;
  name: string;
  category: string;
  color: string | null;
}

export interface OutputNode {
  id: string;
  parent_id: string | null;
  tree_id: string;
  node_type: NodeType;
  file_path: string;
  thumbnail_path: string | null;
  animated_thumbnail_path: string | null;
  mime_type: string;
  file_size: number;
  width: number;
  height: number;
  duration: number | null;
  created_at: string;
  updated_at: string;
  rating: number | null;
  is_favorite: boolean;
  notes: string | null;
  moderation_outcome: ModerationOutcome;
  generation_mode: GenerationMode;
  prompts: Prompt[];
  parent: OutputSummary | null;
  children: OutputSummary[];
  children_count: number;
  tags: Tag[];
}

export interface OutputListResponse {
  items: OutputNode[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface OutputQueryParams {
  page?: number;
  per_page?: number;
  sort_by?: SortBy;
  sort_order?: SortOrder;
  node_type?: NodeType;
  min_rating?: number;
  is_favorite?: boolean;
  search?: string;
}

export type OutputUpdate = Partial<Pick<OutputNode, 'rating' | 'notes' | 'is_favorite' | 'moderation_outcome'>>;
