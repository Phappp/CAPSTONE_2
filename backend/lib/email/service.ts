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