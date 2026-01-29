import express from 'express';
import { UserController } from './controller';
import requireAuthorizedUser from '../../../middlewares/auth';


const setupUserRoute = (controller: UserController) => {
    const router = express.Router();

    router.get('/feed', requireAuthorizedUser, controller.getAllPostOfFollowing.bind(controller));
    router.get('/:id', controller.getOne.bind(controller));
    router.post('/:id/follow', requireAuthorizedUser, controller.followUser.bind(controller));
    router.delete('/:id/unfollow', requireAuthorizedUser, controller.unfollowUser.bind(controller))
    router.get('/:id/following', requireAuthorizedUser, controller.getFollowing.bind(controller))
    router.get('/:id/follower', requireAuthorizedUser, controller.getFollower.bind(controller))
    
    return router;

}

export default setupUserRoute;
