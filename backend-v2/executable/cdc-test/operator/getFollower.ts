import { Operator } from '../pipeline';
import UserModel from '../../../internal/model/user'

class GetFollower implements Operator {

    async run(data: any) : Promise<any> {
        if ( data.operationType == 'insert' ) {
            const author = await UserModel
                                    .findOne({ _id : data?.fullDocument.author });
            return {
                postInfo : data.fullDocument,
                followers : author.followers,
            }
        }
    }
}

export {
    GetFollower,
}