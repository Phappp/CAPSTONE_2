import User from '../../../../../internal/model/user';
import { PostEntity, PostCreationDto, PostService } from '../types';
import AppDataSource from '../../../../../lib/database';

export class PostServiceImpl implements PostService {
  // Note: Post entity has been removed. This service is now deprecated.

  async deletePost(id: string): Promise<PostEntity> {
    throw new Error('Post entity has been removed. This feature is no longer available.');
  }

  async updatePost(id: string, body: PostCreationDto): Promise<PostEntity> {
    throw new Error('Post entity has been removed. This feature is no longer available.');
  }

  async getPost(id: string): Promise<PostEntity> {
    throw new Error('Post entity has been removed. This feature is no longer available.');
  }

  async fetchPostsByUser(id: string): Promise<PostEntity[]> {
    throw new Error('Post entity has been removed. This feature is no longer available.');
  }

  async createPost(postCreationDto: PostCreationDto): Promise<PostEntity> {
    throw new Error('Post entity has been removed. This feature is no longer available.');
  }

}