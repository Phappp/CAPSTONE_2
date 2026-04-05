export interface UpdateProfileDto {
    full_name: string;
    phone_number?: string | null;
    bio?: string | null;
  }
  
  export function validateUpdateProfile(body: any): UpdateProfileDto {
    const { full_name, phone_number, bio } = body;
  
    if (!full_name || typeof full_name !== "string" || full_name.trim().length < 2) {
      throw new Error("Họ và tên tối thiểu 2 ký tự");
    }
  
    if (phone_number && !/^(0|\+84)[0-9]{9,10}$/.test(phone_number)) {
      throw new Error("Số điện thoại không hợp lệ");
    }
  
    if (bio && typeof bio === "string" && bio.length > 500) {
      throw new Error("Giới thiệu tối đa 500 ký tự");
    }
  
    return {
      full_name: full_name.trim(),
      phone_number: phone_number ?? null,
      bio: bio ?? null,
    };
  }