
import { PostSource } from './source/post_source';
import { GetFollower } from './operator/getFollower';
import { Operator, Pipeline } from './pipeline';
import { createClient } from 'redis';
import { RedisSink } from '../mongodb-redis-connector/sink/redis_feeds';

class ChangeStreamClientCode {
    redisClient: ReturnType<typeof createClient>;

    constructor(redisClient: ReturnType<typeof createClient>) {
        this.redisClient = redisClient;
    }

    async start() {
        const postSource = new PostSource();
        const redisSink = new RedisSink(this.redisClient);
        const operators: Operator[] = [];
        const getFollower = new GetFollower();
        operators.push(getFollower);
        const pipeline = new Pipeline(postSource, redisSink, operators);
        pipeline.run();
    }
}

export {
    ChangeStreamClientCode,
}