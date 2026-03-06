import { RedisClientType } from 'redis'

type UserEntity = {
  id: string;
  email: string;
  name: string;
  avatar: string;
}

interface UserService {
  getOne(id: string): Promise<UserEntity>;
  followUser(sub: string, id: string): Promise<void>;
  unfollowUser(sub: string, id: string): Promise<void>;
  getFollowing(sub: string, id: string): Promise<UserEntity>;
  getFollower(sub: string, id: string): Promise<UserEntity>;
}

export {
  UserEntity,
  UserService,
};
