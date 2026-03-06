import { Operator } from '../pipeline';

class TransformPostMetadata implements Operator {
    async run(data: any): Promise<any> {
        console.warn('TransformPostMetadata: Post entity has been removed. This operator is deprecated.');
        return null;
    }
}

export {
    TransformPostMetadata,
};
