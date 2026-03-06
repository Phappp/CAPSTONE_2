import { Source } from '../source';
import EventEmitter from 'events';

class PostSource implements Source {
  async get(): Promise<EventEmitter> {
    const eventEmitter = new EventEmitter();
    console.warn('PostSource: Post entity has been removed. This source is deprecated.');
    return eventEmitter;
  }
}

export {
  PostSource,
};