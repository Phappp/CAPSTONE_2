import { v2 as cloudinary } from 'cloudinary';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

export function isCloudinaryEnabled() {
  return Boolean(cloudName && apiKey && apiSecret);
}

export function getCloudinary() {
  if (!isCloudinaryEnabled()) {
    throw new Error(
      'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.'
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return cloudinary;
}

export async function uploadBufferToCloudinary(opts: {
  buffer: Buffer;
  folder: string;
  originalFilename: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
}) {
  const cld = getCloudinary();
  const resourceType = opts.resourceType ?? 'auto';

  return await new Promise<{
    secure_url: string;
    bytes: number;
    resource_type: string;
    public_id: string;
    original_filename?: string;
    format?: string;
  }>((resolve, reject) => {
    const stream = cld.uploader.upload_stream(
      {
        folder: opts.folder,
        resource_type: resourceType,
        filename_override: opts.originalFilename,
        use_filename: true,
        unique_filename: true,
      },
      (err, result) => {
        if (err || !result) return reject(err || new Error('Upload failed'));
        resolve(result as any);
      }
    );
    stream.end(opts.buffer);
  });
}

/**
 * Tạo signed URL từ secure_url đã lưu (để xem file khi tài khoản Cloudinary bật bảo mật delivery).
 * URL dạng: https://res.cloudinary.com/CLOUD_NAME/RESOURCE_TYPE/upload/vVERSION/PUBLIC_ID
 */
export function getSignedDeliveryUrl(secureUrl: string): string {
  if (!secureUrl || !secureUrl.includes('res.cloudinary.com')) {
    return secureUrl;
  }
  if (!isCloudinaryEnabled()) return secureUrl;

  const cld = getCloudinary();
  const match = secureUrl.match(/^https:\/\/res\.cloudinary\.com\/([^/]+)\/(image|video|raw)\/upload\/(?:v\d+\/)?(.+)$/);
  if (!match) return secureUrl;

  const [, , resourceType, pathAfterUpload] = match;
  const publicId = pathAfterUpload;
  const options: { resource_type?: string; type?: string; sign_url: boolean } = {
    resource_type: resourceType as 'image' | 'video' | 'raw',
    type: 'upload',
    sign_url: true,
  };
  return cld.url(publicId, options);
}





