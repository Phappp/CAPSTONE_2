
import { createClient } from 'redis';

class ChangeStreamClientCode {
    redisClient: ReturnType<typeof createClient>;

    constructor(redisClient: ReturnType<typeof createClient>) {
        this.redisClient = redisClient;
    }

    async start() {
        console.warn('ChangeStreamClientCode: Post and Tag entities have been removed. CDC client is deprecated.')
        // CDC operations disabled
        // const postSource = new PostSource();
        // const redisSink = new RedisSink(this.redisClient);
        // const operators: Operator[] = [];
        // const getFollower = new GetFollower();
        // operators.push(getFollower);
        // const pipeline = new Pipeline(postSource, redisSink, operators);
        // pipeline.run();
    }
}

export {
    ChangeStreamClientCode,
}