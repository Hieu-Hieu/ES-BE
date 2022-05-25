import client from '../connection.js';

const Index = 'comments';

const newComment = async (req, res) => {
    const { postId, createdAt = new Date(), content, parentId, like = [] } = req.body

    try {
        // let err;
        client.index({
            index: Index,
            body: {
                authorId: req.user.id,
                postId,
                createdAt,
                content,
                parentId,
                authorName: req.user.name,
                like
            },
            refresh: true,
        }, async function (err, resp) {
            if (resp.body) {
                res.send({ success: "Add comment success!" })
            } else if (err) {
                console.log(err)
                res.status(404).send({ error: err });
            }
        });
    } catch (error) {
        res.send(error);
        console.log(error)
    }
}

const getCommentByPost = async (req, res) => {
    // const { from = 0, size = 10 } = req.query;
    const { postId } = req.params;
    console.log(postId)
    try {
        const result = await client.search({
            index: Index,
            // from: from,
            // size: size,
            body: {
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
            },

        });
        if (result.body) {
            const data = result.body.hits.hits;
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
        console.log(userId)
        const result = await client.count({
            index: Index,
            body: {
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
            },

        });
        res.send({ count: result.body.count, userId: userId })
    } catch (error) {
        let err = error.name ? { error: error.name } : error
        res.send(err);
    }
}

const replyComment = async (req, res) => {

}

export { newComment, getCommentByPost, countCommentedOfUser }