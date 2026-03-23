import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import {
  AuthService,
  ExchangeTokenResult,
  ExchangeTokenRequest,
  LoginRequest,
  LoginResult,
  RegisterRequest,
  TokenPair,
} from '../types';
import User from '../../../../../internal/model/user';
import Session from '../../../../../internal/model/session';
import UserRole from '../../../../../internal/model/user_roles';
import Role from '../../../../../internal/model/role';
import PendingRegistration from '../../../../../internal/model/pending_registration';
import jwt from 'jsonwebtoken';
import { GoogleIdentityBroker } from '../identity-broker/google-idp.broker';
import AppDataSource from '../../../../../lib/database';

export class AuthServiceImpl implements AuthService {
  googleIdentityBroker: GoogleIdentityBroker;
  jwtSecret: string;
  jwtRefreshSecret: string;

  constructor(
    googleIdentityBroker: GoogleIdentityBroker,
    jwtSecret: string,
    jwtRefreshSecret: string,
  ) {
    this.googleIdentityBroker = googleIdentityBroker;
    this.jwtSecret = jwtSecret;
    this.jwtRefreshSecret = jwtRefreshSecret;
  }

  private async signTokensForUser(user: User, sessionID: string): Promise<TokenPair> {
    const jwtPayload = {
      _id: user.id,
      sub: user.id,
      sid: sessionID,
    };
    const accessToken = this.signAccessToken(jwtPayload);
    const refreshToken = this.signRefreshToken(jwtPayload);
    return { accessToken, refreshToken };
  }

  private async mapUserToAuthUser(user: User) {
    // Lấy các vai trò (roles) của user để frontend có thể điều hướng theo role
    const userRoleRepository = AppDataSource.getRepository(UserRole);
    const roleRepository = AppDataSource.getRepository(Role);

    const userRoles = await userRoleRepository.find({
      where: { user_id: user.id },
    });

    let roles: string[] = [];
    if (userRoles.length > 0) {
      const roleIds = userRoles.map((ur) => ur.role_id);
      const dbRoles = await roleRepository.findByIds(roleIds);
      roles = dbRoles.map((r) => r.name);
    }

    const primaryRole = roles[0] ?? null;

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      roles,
      primary_role: primaryRole,
    };
  }

  signAccessToken(payload: any): string {
    return jwt.sign({
      ...payload,
    }, this.jwtSecret, { expiresIn: '1d' });
  }

  signRefreshToken(payload: any): string {
    return jwt.sign({ ...payload, typ: 'offline' }, this.jwtRefreshSecret, { expiresIn: '30d' });
  }

  verifyToken(token: string, secret: string): any {
    return jwt.verify(token, secret);
  }

  async createUserIfNotExists(userProfile: any): Promise<User> {
    const userRepository = AppDataSource.getRepository(User);

    if (!userProfile.email) {
      throw new Error('Email không được cung cấp từ Google');
    }

    let user = await userRepository.findOne({ where: { email: userProfile.email } });

    if (!user) {
      user = userRepository.create({
        email: userProfile.email,
        full_name: userProfile.name ?? userProfile.email.split('@')[0] ?? '',
        avatar_url: userProfile.picture ?? null,
        password_hash: '', // Google login không dùng password
        is_active: true,
        email_verified_at: new Date(), // Email đã được Google xác thực
      });

      await userRepository.save(user);
    } else {
      // Cập nhật avatar nếu user đã tồn tại nhưng chưa có avatar
      if (!user.avatar_url && userProfile.picture) {
        user.avatar_url = userProfile.picture;
        await userRepository.save(user);
      }
    }

    return user;
  }

  private generateOtpCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
  }

  // Đăng ký tài khoản bằng email/mật khẩu: tạo user (is_active=false) và gửi OTP
  async register(request: RegisterRequest): Promise<void> {
    const userRepository = AppDataSource.getRepository(User);
    const pendingRegistrationRepo = AppDataSource.getRepository(PendingRegistration);

    const existingUser = await userRepository.findOne({ where: { email: request.email } });
    if (existingUser) {
      throw new Error('Email đã được sử dụng.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(request.password, salt);

    // Chuẩn hóa role, chỉ cho phép 'learner' hoặc 'course_manager'
    const normalizedRole =
      request.role === 'course_manager' ? 'course_manager' : 'learner';

    // Tạo/ghi đè bản ghi đăng ký tạm với OTP
    const code = this.generateOtpCode();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

    let pending = await pendingRegistrationRepo.findOne({
      where: { email: request.email },
    });

    if (!pending) {
      pending = pendingRegistrationRepo.create({
        email: request.email,
        full_name: request.fullName,
        password_hash: passwordHash,
        role_name: normalizedRole,
        code,
        expires_at: expires,
      });
    } else {
      pending.full_name = request.fullName;
      pending.password_hash = passwordHash;
      pending.role_name = normalizedRole;
      pending.code = code;
      pending.expires_at = expires;
    }

    await pendingRegistrationRepo.save(pending);

    // Gửi email OTP
    try {
      const { sendMail } = await import('../../../../../lib/mailer');
      await sendMail(
        request.email,
        'Mã xác thực đăng ký tài khoản',
        `Mã OTP của bạn là: ${code}. Mã có hiệu lực trong 10 phút.`
      );
    } catch (e) {
      console.log('Send OTP email error:', e);
    }
  }

  // Xác thực OTP và trả về token + user
  async verifyRegistrationOtp(email: string, code: string): Promise<LoginResult> {
    const userRepository = AppDataSource.getRepository(User);
    const pendingRegistrationRepo = AppDataSource.getRepository(PendingRegistration);
    const sessionRepository = AppDataSource.getRepository(Session);

    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new Error('Tài khoản đã được kích hoạt hoặc email đã được sử dụng.');
    }

    const pending = await pendingRegistrationRepo.findOne({ where: { email } });
    if (!pending) {
      throw new Error('Không tìm thấy yêu cầu đăng ký cho email này.');
    }

    const now = new Date();
    if (pending.code !== code || pending.expires_at < now) {
      throw new Error('Mã OTP không hợp lệ hoặc đã hết hạn.');
    }
    // Tạo user thật khi OTP hợp lệ
    const user = userRepository.create({
      email: pending.email,
      full_name: pending.full_name,
      password_hash: pending.password_hash,
      is_active: true,
      email_verified_at: now,
    });
    await userRepository.save(user);

    // Gán role mặc định theo đăng ký (learner / course_manager)
    // Hỗ trợ cả tên role cũ (student/teacher) để tương thích dữ liệu DB cũ
    // và tự tạo role nếu chưa tồn tại trong bảng `roles`.
    try {
      const roleRepository = AppDataSource.getRepository(Role);
      const userRoleRepository = AppDataSource.getRepository(UserRole);

      let targetNames: string[] = [];
      if (pending.role_name === 'course_manager') {
        // role mới cho giảng viên; fallback về 'teacher' nếu DB đang dùng tên cũ
        targetNames = ['course_manager', 'teacher'];
      } else if (pending.role_name === 'learner') {
        // role mới cho học viên; fallback về 'student' nếu DB đang dùng tên cũ
        targetNames = ['learner', 'student'];
      } else {
        targetNames = [pending.role_name];
      }

      let defaultRole = await roleRepository.findOne({
        where: targetNames.map((name) => ({ name })),
      });
      // Nếu không tìm thấy role nào, tự tạo role theo pending.role_name
      if (!defaultRole) {
        defaultRole = roleRepository.create({
          name: pending.role_name,
          description: 'Auto-created default role from registration',
        });
        await roleRepository.save(defaultRole);
      }
      if (defaultRole) {
        const existingUserRole = await userRoleRepository.findOne({
          where: { user_id: user.id, role_id: defaultRole.id },
        });
        if (!existingUserRole) {
          const userRole = userRoleRepository.create({
            user_id: user.id,
            role_id: defaultRole.id,
          });
          await userRoleRepository.save(userRole);
        }
      }
    } catch (e) {
      // Nếu lỗi khi gán role thì bỏ qua, không chặn kích hoạt
      console.log('Assign default role error:', e);
    }

    // Xóa bản ghi đăng ký tạm sau khi đã tạo user
    await pendingRegistrationRepo.delete({ id: pending.id });

    const sessionID = uuidv4();
    const session = sessionRepository.create({
      sessionID,
      userID: String(user.id),
    });
    await sessionRepository.save(session);

    const tokens = await this.signTokensForUser(user, sessionID);
    const authUser = await this.mapUserToAuthUser(user);

    return {
      ...tokens,
      user: authUser,
    };
  }

  // Đăng nhập bằng email/mật khẩu
  // Đăng nhập bằng email/mật khẩu
  async login(request: LoginRequest): Promise<LoginResult> {
    const userRepository = AppDataSource.getRepository(User);
    const now = new Date();

    const user = await userRepository.findOne({ where: { email: request.email } });
    if (!user || !user.password_hash) {
      throw new Error('Email hoặc mật khẩu không đúng.');
    }

    if (user.locked_until && user.locked_until > now) {
      throw new Error('Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.');
    }

    if (!user.email_verified_at) {
      throw new Error('Tài khoản chưa được kích hoạt.');
    }

    if (!user.is_active) {
      throw new Error('Tài khoản của bạn đã bị khóa.');
    }

    const isValid = await bcrypt.compare(request.password, user.password_hash);
    if (!isValid) {
      const currentFailed = user.failed_login_attempts || 0;
      const newFailed = currentFailed + 1;
      user.failed_login_attempts = newFailed;
      if (newFailed >= 5) {
        user.locked_until = new Date(now.getTime() + 15 * 60 * 1000);
      }
      await userRepository.save(user);
      throw new Error('Email hoặc mật khẩu không đúng.');
    }

    // Đăng nhập thành công -> reset đếm sai
    user.failed_login_attempts = 0;
    user.locked_until = null;
    user.last_login_at = now;
    await userRepository.save(user);

    // --- LOGIC BẢO MẬT TAB 3 CHO ĐỒ ÁN ---

    // 1. Kiểm tra Thông báo đăng nhập mới
    if (user.notify_new_login) {
      try {
        const { sendMail } = await import('../../../../../lib/mailer');
        await sendMail(
          user.email,
          'Cảnh báo đăng nhập mới - MindBridge',
          `Tài khoản của bạn vừa được đăng nhập vào lúc ${now.toLocaleString('vi-VN')}.`
        );
      } catch (e) {
        console.log('Notification email error:', e);
      }
    }

    // 2. KIỂM TRA 2FA (QUAN TRỌNG)
    if (user.is_2fa_enabled) {
      const otpCode = this.generateOtpCode();
      user.temp_otp = otpCode; // Lưu vào cột temp_otp trong DB
      await userRepository.save(user);

      // Gửi mã OTP qua email
      try {
        const { sendMail } = await import('../../../../../lib/mailer');
        await sendMail(
          user.email,
          'Mã xác thực 2FA - MindBridge',
          `Mã xác thực của bạn là: ${otpCode}. Mã có hiệu lực trong 5 phút.`
        );
      } catch (e) {
        console.log('2FA OTP email error:', e);
      }

      // TRẢ VỀ YÊU CẦU 2FA VÀ DỪNG LUỒNG TẠI ĐÂY
      return {
        requires2FA: true,
        email: user.email,
      } as any;
    }

    // --- KẾT THÚC LOGIC BẢO MẬT ---

    const sessionRepository = AppDataSource.getRepository(Session);
    const sessionID = uuidv4();
    const session = sessionRepository.create({
      sessionID,
      userID: String(user.id),
    });
    await sessionRepository.save(session);

    const tokens = await this.signTokensForUser(user, sessionID);
    const authUser = await this.mapUserToAuthUser(user);

    return {
      ...tokens,
      user: authUser,
    };
  }

  async exchangeWithGoogleIDP(request: ExchangeTokenRequest): Promise<ExchangeTokenResult> {
    const { code } = request;
    const googleToken = await this.googleIdentityBroker.exchangeAuthorizationCode(code);
    const userProfile = await this.googleIdentityBroker.fetchProfile({
      idToken: googleToken.idToken,
      accessToken: googleToken.accessToken,
    });

    // Kiểm tra email có tồn tại không
    if (!userProfile.email) {
      throw new Error('Không thể lấy email từ Google. Vui lòng đảm bảo bạn đã cấp quyền email.');
    }

    const user = await this.createUserIfNotExists(userProfile);

    // === THÊM: Gán role mặc định cho user đăng nhập Google ===
    const userRoleRepository = AppDataSource.getRepository(UserRole);
    const roleRepository = AppDataSource.getRepository(Role);

    // Kiểm tra user đã có role chưa
    const existingRoles = await userRoleRepository.find({
      where: { user_id: user.id }
    });

    if (existingRoles.length === 0) {
      // Tìm role 'learner' hoặc 'student' mặc định
      let defaultRole = await roleRepository.findOne({
        where: [{ name: 'learner' }, { name: 'student' }]
      });

      if (!defaultRole) {
        // Tạo role mới nếu chưa tồn tại
        defaultRole = roleRepository.create({
          name: 'learner',
          description: 'Default role for Google login users'
        });
        await roleRepository.save(defaultRole);
      }

      // Gán role cho user
      const userRole = userRoleRepository.create({
        user_id: user.id,
        role_id: defaultRole.id
      });
      await userRoleRepository.save(userRole);
    }
    // === KẾT THÚC THÊM ===

    const sessionRepository = AppDataSource.getRepository(Session);
    const sessionID = uuidv4();
    const session = sessionRepository.create({
      sessionID: sessionID,
      userID: String(user.id)
    });
    await sessionRepository.save(session);

    const tokens = await this.signTokensForUser(user, sessionID);

    return {
      refreshToken: tokens.refreshToken,
      accessToken: tokens.accessToken,
      sub: String(user.id),
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const jwtClaims = jwt.verify(refreshToken, this.jwtRefreshSecret);
    const sid = jwtClaims['sid'];

    const sessionRepository = AppDataSource.getRepository(Session);
    await sessionRepository.delete({
      sessionID: sid,
    });
  }

  async refreshToken(token: string): Promise<ExchangeTokenResult> {
    const jwtClaims = this.verifyToken(token, this.jwtRefreshSecret);
    const sessionID = jwtClaims['sid'];
    const subject = jwtClaims['sub'];

    const sessionRepository = AppDataSource.getRepository(Session);
    const session = await sessionRepository.findOne({ where: { sessionID } });
    if (!session) {
      throw new Error('')
    }

    const jwtPayload = {
      _id: jwtClaims['sub'],
      sub: jwtClaims['sub'],
      sid: sessionID,
    };

    const newAccessToken = this.signAccessToken(jwtPayload);
    const newRefreshToken = this.signRefreshToken(jwtPayload);


    return {
      sub: String(subject),
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    }
  }
  async verify2FA(email: string, code: string): Promise<LoginResult> {
    const userRepository = AppDataSource.getRepository(User);

    // 1. Tìm user theo email
    const user = await userRepository.findOne({ where: { email, is_active: true } });
    if (!user) {
      throw new Error('Người dùng không tồn tại hoặc đã bị khóa.');
    }

    // 2. Kiểm tra mã OTP
    // (Đảm bảo bạn đã thêm cột temp_otp vào model User như đã bàn)
    if (!user.temp_otp || user.temp_otp !== code) {
      throw new Error('Mã xác thực không chính xác.');
    }

    // 3. Xác thực thành công -> Xóa OTP và tạo session mới
    user.temp_otp = null;
    await userRepository.save(user);

    const sessionRepository = AppDataSource.getRepository(Session);
    const sessionID = uuidv4();
    const session = sessionRepository.create({
      sessionID,
      userID: String(user.id),
    });
    await sessionRepository.save(session);

    // 4. Ký và trả về token chính thức
    const tokens = await this.signTokensForUser(user, sessionID);
    const authUser = await this.mapUserToAuthUser(user);

    return {
      ...tokens,
      user: authUser,
    };
  }
}
