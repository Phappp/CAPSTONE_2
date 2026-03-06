import { UserEntity, UserService } from '../types';
import User from '../../../../../internal/model/user';
import { BaseController } from '../../../shared/base-controller';
import { createClient } from 'redis';
import { RedisClientType } from 'redis';
import AppDataSource from '../../../../../lib/database';


export class UserServiceImpl extends BaseController implements UserService {
  async getOne(id: string): Promise<UserEntity> {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id } });

    return {
      id: String(user.id),
      name: String(user.name),
      avatar: String(user.avatar),
      email: String(user.email),
    };
  }

  async followUser(sub: string, id: string): Promise<void> {
    const userRepository = AppDataSource.getRepository(User);
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await userRepository.findOne({
        where: { id: sub },
        relations: ['followings']
      });
      const followUserEntity = await userRepository.findOne({
        where: { id },
        relations: ['followers']
      });

      if (!followUserEntity) {
        throw new Error("User not found");
      }
      if (followUserEntity.id === user.id) {
        throw new Error("Cannot follow");
      }

      if (user.followings.some(u => u.id === followUserEntity.id)) {
        throw new Error("You have followed this user");
      }

      user.followings.push(followUserEntity);
      followUserEntity.followers.push(user);

      await userRepository.save(user);
      await userRepository.save(followUserEntity);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async unfollowUser(sub: string, id: string): Promise<void> {
    const userRepository = AppDataSource.getRepository(User);
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await userRepository.findOne({
        where: { id: sub },
        relations: ['followings']
      });
      const unfollowUserEntity = await userRepository.findOne({
        where: { id },
        relations: ['followers']
      });

      if (!unfollowUserEntity) {
        throw new Error("User not found.");
      }

      const followingIndex = user.followings.findIndex(u => u.id === unfollowUserEntity.id);
      if (followingIndex === -1) {
        throw new Error("You do not follow this user.");
      }

      const followerIndex = unfollowUserEntity.followers.findIndex(u => u.id === user.id);
      if (followerIndex === -1) {
        throw new Error("You do not follow this user.");
      }

      user.followings.splice(followingIndex, 1);
      unfollowUserEntity.followers.splice(followerIndex, 1);

      await userRepository.save(user);
      await userRepository.save(unfollowUserEntity);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getFollowing(sub: string, id: string): Promise<UserEntity> {
    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: sub },
        relations: ['followings']
      });
      const following = await userRepository.findOne({ where: { id } });

      if (!following) {
        throw new Error("This user does not exist.");
      }

      if (!user.followings.some(u => u.id === following.id)) {
        throw new Error("You do not follow this user.");
      }

      return {
        id: String(following.id),
        name: String(following.name),
        avatar: String(following.avatar),
        email: String(following.email),
      };
    } catch (error) {
      throw error;
    }
  }

  async getFollower(sub: string, id: string): Promise<UserEntity> {
    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: sub },
        relations: ['followers']
      });
      const follower = await userRepository.findOne({ where: { id } });

      if (!follower) {
        throw new Error("This user does not exist.");
      }

      if (!user.followers.some(u => u.id === follower.id)) {
        throw new Error("This user is not following you.");
      }

      return {
        id: String(follower.id),
        name: String(follower.name),
        avatar: String(follower.avatar),
        email: String(follower.email),
      };
    } catch (error) {
      throw error;
    }
  }

  private redisClient: RedisClientType;

  constructor() {
    super();
    this.redisClient = createClient();
    this.redisClient.connect();
  }
}