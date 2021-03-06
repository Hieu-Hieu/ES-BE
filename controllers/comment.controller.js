import client from '../connection.js';

const Index = 'comments';

const newComment = async (req, res) => {
    const { postId, createdAt = new Date(), content, parentId, like = [] } = req.body

    try {
        const result = await client.index({
            index: Index,
            document: {
                authorId: req.user.id,
                postId,
                createdAt,
                content,
                parentId,
                authorName: req.user.name,
                like
            },
            refresh: true,
        })
        if (result) {
            res.send({ success: "Add comment success!" })
        }
        // console.log('New cmt 2', result)
    } catch (error) {
        res.send(error);
        console.log(error)
    }
}

const getCommentByPost = async (req, res) => {
    // const { from = 0, size = 10 } = req.query;
    const { postId } = req.params;
    // console.log(postId)
    try {
        const result = await client.search({
            index: Index,
            query: {
                bool: {
                    must: [
                        {
                            match: {
                                postId: postId,
                            },
                        },
                    ],
                },
            },
        });
        if (result) {
            const data = result.hits.hits;
            res.send({ total: data.length, data });
            return;
        }
    } catch (error) {
        let err = error.name ? { error: error.name } : error
        res.send(err);
    }
}

const countCommentedOfUser = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await client.count({
            index: Index,
            query: {
                bool: {
                    must: [
                        {
                            match: {
                                authorId: userId,
                            },
                        },
                    ],
                },
            },
        });
        res.send({ count: result.count, userId: userId })
    } catch (error) {
        let err = error.name ? { error: error.name } : error
        res.send(err);
    }
}

// const replyComment = async (req, res) => {

// }

export { newComment, getCommentByPost, countCommentedOfUser }