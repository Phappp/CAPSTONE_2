export const emailLayout = (content: string) => {
  return `
  <div style="background:#f2f4f7;padding:40px 0;font-family:Roboto,Arial,sans-serif">
    <div style="
      max-width:520px;
      margin:auto;
      background:white;
      border-radius:8px;
      padding:30px;
      box-shadow:0 1px 3px rgba(0,0,0,0.1)
    ">
      
      ${emailHeader()}

      ${content}

      ${emailFooter()}

    </div>
  </div>
  `;
};

export const emailHeader = () => `
  <div style="text-align:center;margin-bottom:20px">
    <img 
      src="https://res.cloudinary.com/dv5nftpo5/image/upload/w_240,q_auto,f_auto/v1774424264/trans-logo_qffus2.png"
      alt="MindBridge"
      width="120"
      style="
        max-width:120px;
        height:auto;
        display:block;
        margin:0 auto;
      "
    />
    <div style="
      height:1px;
      background:#e5e7eb;
      width:100%;
      margin-top:10px;
    "></div>
  </div>
`;

export const emailFooter = () => `
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:30px 0;" />

  <div style="text-align:center;font-size:12px;color:#5f6368;line-height:1.6">
    <p>
      Chúng tôi gửi email này để thông báo cho bạn biết về những thay đổi quan trọng đối với Tài khoản MindBridge và dịch vụ của bạn.
    </p>

    <p>
      Nếu bạn không thực hiện hành động này, vui lòng kiểm tra bảo mật.
    </p>

    <p>
      Lưu ý: Đây là email tự động, vui lòng không trả lời. Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua email <a href="mailto:mynamephap@gmail.com">mynamephap@gmail.com</a>
    </p>

    <p style="margin-top:10px;font-size:11px;color:#9aa0a6">
      © 2026 MindBridge, Duy Tan University, Da Nang, Vietnam
      <br />
      All rights reserved.
    </p>
  </div>
`;