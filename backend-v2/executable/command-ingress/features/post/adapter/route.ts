import express from 'express';
import requireAuthorizedUser from '../../../middlewares/auth';
import { PostController } from './controller';


const setupPostRoute = (
  controller: PostController
) => {
  const router = express.Router();

  router.route('/')
    .post(requireAuthorizedUser, controller.createPost.bind(controller));

  router.route('/users/:id')
    .get(controller.fetchPostByUser.bind(controller));

  router.route('/:id')
    .get(controller.getPost.bind(controller));

  router.route('/:id')
    .put(requireAuthorizedUser, controller.updatePost.bind(controller));

  router.route('/:id')
    .delete(requireAuthorizedUser, controller.deletePost.bind(controller));
  return router;
}

export default setupPostRoute;
