import { v4 as uuidv4 } from 'uuid';
import { AuthService, ExchangeTokenResult, ExchangeTokenRequest } from '../types';
import User from '../../../../../internal/model/user';
import Session from '../../../../../internal/model/session';
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

  async createUserIfNotExists(userProfile: any): Promise<any> {
    const userRepository = AppDataSource.getRepository(User);
    let user = await userRepository.findOne({ where: { email: userProfile.email } });
    if (!user) {
      user = userRepository.create({
        name: userProfile.name,
        email: userProfile.email,
        avatar: userProfile.picture ?? '',
        lists: [
          {
            name: 'Reading list',
            posts: [],
            images: [],
          },
        ],
        followers: [],
        followings: [],
        interests: [],
      });

      await userRepository.save(user);
    }

    return user;
  }

  async exchangeWithGoogleIDP(request: ExchangeTokenRequest): Promise<ExchangeTokenResult> {
    const { code } = request;
    const googleToken = await this.googleIdentityBroker.exchangeAuthorizationCode(code);
    const userProfile = await this.googleIdentityBroker.fetchProfile({
      idToken: googleToken.idToken,
      accessToken: googleToken.accessToken,
    });

    const user = await this.createUserIfNotExists(userProfile);
    const sessionID = uuidv4();
    const jwtPayload = {
      _id: user.id,
      sub: user.id,
      sid: sessionID,
    };
    const accessToken = this.signAccessToken(jwtPayload);
    const refreshToken = this.signRefreshToken(jwtPayload)

    const sessionRepository = AppDataSource.getRepository(Session);
    const session = sessionRepository.create({ sessionID: sessionID, userID: user.id });
    await sessionRepository.save(session);

    return {
      refreshToken,
      accessToken,
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
}
