import { PostEntity } from "../post/types";
import {RedisClientType} from 'redis'




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
  getAllPostOfFollowing(sub: string, redisClient: RedisClientType): Promise<PostEntity[]>;  
}

export {
  UserEntity,
  UserService,
};
