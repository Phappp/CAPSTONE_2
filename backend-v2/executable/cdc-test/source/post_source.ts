import { Source } from '../source';
import EventEmitter from 'events';
import Post from '../../../internal/model/post';

class PostSource implements Source {
  async get(): Promise<EventEmitter> {
    const eventEmitter = new EventEmitter();

    Post.watch()
      .on('change', (data: any) => {
        eventEmitter.emit('change', data);
      });

    return eventEmitter;
  }
}

export {
  PostSource,
};