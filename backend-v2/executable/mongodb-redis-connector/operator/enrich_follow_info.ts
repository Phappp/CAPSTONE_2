import { Operator } from '../pipeline';

class EnrichUserFollowInfo implements Operator {

    constructor() {
    }

    async run(data: any): Promise<any> {
        console.warn('EnrichUserFollowInfo: Post entity has been removed. This operator is deprecated.');
        return null;
    }
}

export {
    EnrichUserFollowInfo,
};