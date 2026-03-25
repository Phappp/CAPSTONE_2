import { emailLayout } from './layout';

export const loginWarningTemplate = (
time: string, ip: string, device: string, location: string) => {
  const content = `
    <h2 style="font-size:20px;color:#202124;text-align:center">
      Ai đó mới đăng nhập tài khoản
    </h2>

    <p style="text-align:center;color:#5f6368;font-size:14px">
      Chúng tôi phát hiện thấy mới có một yêu cầu đăng nhập vào Tài khoản MindBridge của bạn. Nếu đây là yêu cầu của bạn, thì bạn không phải làm gì thêm. Nếu đây không phải là yêu cầu của bạn, thì chúng tôi sẽ giúp bạn bảo mật tài khoản.
    </p>

    <div style="
      border:1px solid #e5e7eb;
      border-radius:8px;
      padding:15px;
      margin:25px 0;
      font-size:14px;
      color:#202124;
    ">
      <p>
        <b>Thời gian:</b>
        <span style="color:#d93025;font-weight:500">${time}</span>
      </p>
      <p>
        <b>Vị trí:</b>
        <span style="color:#d93025;font-weight:500">${location}</span>
      </p>
      <p>
        <b>IP:</b>
        <span style="color:#d93025;font-weight:500">${ip}</span>
      </p>
      <p>
        <b>Thiết bị:</b>
        <span style="color:#d93025;font-weight:500">${device}</span>
      </p>
    </div>

    <div style="text-align:center;margin:30px 0">
      <a href="#" style="
        background:#1a73e8;
        color:white;
        padding:12px 24px;
        border-radius:6px;
        text-decoration:none;
        font-weight:500;
        font-size:14px;
        display:inline-block;
      ">
        Bảo vệ tài khoản
      </a>
    </div>

    <p style="text-align:center;color:#5f6368;font-size:13px">
      Nếu đây là bạn, bạn không cần làm gì thêm.
    </p>
  `;

  return emailLayout(content);
};