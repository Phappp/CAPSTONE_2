export interface Profile {
    id: number;
    full_name: string;
    email: string;
    avatar_url: string | null;
    phone_number: string | null;
    bio: string | null;
    created_at: string;
    roles: string[];
    statistics?: {
      courses_enrolled: number;
      courses_completed: number;
      assignments_submitted: number;
      average_score: number;
    };
  }
  
  export interface UpdateProfileInput {
    full_name: string;
    phone_number?: string | null;
    bio?: string | null;
  }
  
  export interface UploadAvatarResult {
    avatar_url: string;
  }