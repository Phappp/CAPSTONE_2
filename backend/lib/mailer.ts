import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    // Cho phép self-signed certificate khi đang ở môi trường DEV để tránh lỗi ESOCKET
    // Tuyệt đối không nên bật rejectUnauthorized: false trên môi trường production.
    tls: process.env.DEV === 'true' ? { rejectUnauthorized: false } : undefined,
});

export async function sendMail(to: string, subject: string, html: string) {
    // Nếu thiếu cấu hình SMTP thì bỏ qua việc gửi mail để tránh throw lỗi trong lúc dev
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('SMTP credentials are not fully set, skip sending email.');
        return;
    }

    await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to,
        subject,
        html,
    });
}



