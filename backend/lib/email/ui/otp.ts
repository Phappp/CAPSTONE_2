import { emailLayout } from './layout';

export const otpUI= (otp: string) => {
  const content = `
    <h2 style="font-size:20px;color:#202124;text-align:center;margin-bottom:10px"
      Xác minh tài khoản của bạn
    </h2>

    <p style="text-align:center;color:#5f6368;font-size:14px">
      Nhập mã OTP bên dưới để xác minh tài khoản của bạn. Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.
    </p>

    <div style="
      text-align:center;
      font-size:28px;
      letter-spacing:6px;
      font-weight:bold;
      color:#202124;
      margin:30px 0;
    ">
      ${otp}
    </div>

    <p style="text-align:center;color:#5f6368;font-size:13px">
      Mã có hiệu lực trong 10 phút
    </p>
  `;

  return emailLayout(content);
};