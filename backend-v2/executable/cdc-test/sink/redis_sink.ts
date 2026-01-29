
import { createClient } from 'redis';
import { Sink } from '../sink';

class RedisSink implements Sink {
    redisClient : ReturnType<typeof createClient>;

    constructor( redisClient : ReturnType<typeof createClient> ) {
        this.redisClient = redisClient;
    }

    async save(data: any) : Promise<void> {
        const followers = data.followers;
        const post = data.postInfo;
        const score = new Date(post.createdAt).getTime();
        for(const follower of followers) {
            this.redisClient.zAdd(
                `userId : ${follower}`,
                [{
                    score : score,
                    value : JSON.stringify(post)
                }]
            )
        }
    }
}

export {
    RedisSink,
}