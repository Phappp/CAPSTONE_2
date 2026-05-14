import { sendMail } from '../mailer';
import { otpUI } from './ui/otp';
import { loginWarningTemplate } from './ui/login-warning';
import { getLocationFromIP } from '../ip-location';


export const sendOtpEmail = async (email: string, otp: string) => {
  await sendMail(
    email,
    'Yêu cầu xác thực tài khoản',
    otpUI(otp)
  );
};

export const sendLoginWarningEmail = async (
  email: string,
  ip: string,
  device: string
) => {
  const time = new Date().toLocaleString();

  const location = await getLocationFromIP(ip);

  await sendMail(
    email,
    'Cảnh báo bảo mật',
    loginWarningTemplate(
      time,
      ip,
      device,
      location
    )
  );
};

export const sendPasswordResetEmail = async (
  email: string,
  resetLink: string
) => {
  await sendMail(
    email,
    'Yeu cau dat lai mat khau',
    `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Dat lai mat khau</h2>
        <p>Chung toi da nhan duoc yeu cau dat lai mat khau cho tai khoan cua ban.</p>
        <p>Vui long bam vao lien ket ben duoi de dat lai mat khau (hieu luc trong 15 phut):</p>
        <p>
          <a href="${resetLink}" style="display: inline-block; padding: 10px 16px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px;">
            Dat lai mat khau
          </a>
        </p>
        <p>Neu ban khong thuc hien yeu cau nay, vui long bo qua email.</p>
      </div>
    `
  );
};