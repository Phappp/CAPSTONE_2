import { Operator } from '../pipeline';

class GetFollower implements Operator {

    async run(data: any): Promise<any> {
        console.warn('GetFollower: Post entity has been removed. This operator is deprecated.');
        return null;
    }
}

export {
    GetFollower,
}