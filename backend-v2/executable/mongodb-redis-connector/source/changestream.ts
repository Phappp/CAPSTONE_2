import { createClient } from 'redis';
import { Source } from '../source';
import EventEmitter from 'events';


class MongoDBChangeStreamSource implements Source {
    async get(): Promise<EventEmitter> {
        const eventEmitter = new EventEmitter();
        console.info('MongoDBChangeStreamSource: Post and Tag entities have been removed');
        return eventEmitter;
    }
}

export {
    MongoDBChangeStreamSource,
};