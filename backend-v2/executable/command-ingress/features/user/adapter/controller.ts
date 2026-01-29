import { BaseController } from '../../../shared/base-controller';
import { HttpRequest } from '../../../types';
import { UserEntity, UserService } from '../types';
import { Response, NextFunction } from 'express';
import { followUser } from '../service';
import { RedisClientType } from 'redis';

export class UserController extends BaseController {
  // service: PostService;
  redisClient: RedisClientType;

 

  service: UserService;

  constructor(service: UserService, redisClient: RedisClientType) {
    super();
    this.service = service;
    this.redisClient = redisClient;
  }

  async getOne(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res, _next) => {
      const { id } = req.params;
      const user = await this.service.getOne(id);
      res.status(200).json(user);
      return;
    });
  }

  async followUser(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res, _next) => {
      const { id } = req.params;
      const sub = req.getSubject();
      await this.service.followUser(sub, id);

      res.status(200).json({
        message: 'Followed User',
      });
      return;
    })
  }

  async unfollowUser(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res, _next) => {
      const { id } = req.params;
      const sub = req.getSubject();
      await this.service.unfollowUser(sub, id);
      res.status(200).json({
        message: 'Unfollowed User'
      })
    })
  }

  async getFollowing(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res, _next) => {
      const { id } = req.params;
      const sub = req.getSubject();
      const following = await this.service.getFollowing(sub, id);

      res.status(200).json({
        message: "Get Following Completed",
        Information: following
      })
      return;
    })
  }

  async getFollower(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res, _next) => {
      const { id } = req.params;
      const sub = req.getSubject();
      const follower = await this.service.getFollower(sub, id);

      res.status(200).json({
        message: "Get Follower Completed",
        Information: follower
      })
    })
  }

  async getAllPostOfFollowing(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res, _next) => {
      console.log("check1")
      const sub = req.getSubject();
      console.log("sub: ", sub);
      console.log("check2")

      const post = await this.service.getAllPostOfFollowing(sub, this.redisClient);

      res.status(200).json({
        message: "Get All Post of following Completed",
        Information: post
      })
    })
  }
}