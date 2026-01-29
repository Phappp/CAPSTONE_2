
import {Operator} from '../pipeline';
import _ from 'lodash';

class TransformPostMetadata implements Operator {
    async run(data: any): Promise<any> {
        if (!this.isNewPost(data)) {
            return;
        }
       
    }

    isNewPost(data: any): boolean {
        const operationType = _.get(data, 'operationType');
        const author = _.get(data, 'fullDocument.userId', '');

        return operationType === 'insert' && author !== '';
    }
    // isUpdatePost(data: any): boolean {
    //     const operationType = _.get(data, 'operationType');
    //     return operationType === 'update';
    // }

    // isDeletePost(data: any): boolean {
    //     const operationType = _.get(data, 'operationType');
    //     return operationType === 'delete';
    // }
}

export {
    TransformPostMetadata,
};
