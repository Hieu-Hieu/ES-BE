import uniqid from 'uniqid';
import client from '../connection.js';
import slugify from 'slugify';
import { v2 as cloudinary } from 'cloudinary'

const postIndex = 'posts';

const { CLOUD_NAME, API_KEY, API_SECRET } = process.env;
cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
});


const newPost = async (req, res) => {
    const { tags, isPublish = true, title, content, date } = req.body
    let publishedAt = "";
    if (isPublish) publishedAt = new Date();
    let coverImg = "";
    let cloudinaryId = ""
    // console.log(req.body)
    if (req.file) {
        await cloudinary.uploader.upload(
            req.file.path,
            { folder: "blog" },
            (err, result) => {
                if (err) {
                    res.status(500).json({
                        error: "Internal server error",
                    });
                    return;
                }
                coverImg = result.secure_url;
                // console.log(coverImg)
                cloudinaryId = result.public_id;
            }
        );
    }

    try {
        const newPost = {
            id: "p-" + uniqid(),
            title: title,
            slug: slugify(title),
            tags: tags.split(",") || [],
            coverImg: coverImg,
            content: content,
            isPublish: isPublish,
            publishedAt: publishedAt,
            createdAt: date || new Date(),
            authorId: req.user.id,
            authorName: req.user.name,
            likes: [],
            cloudinaryId: cloudinaryId,
        }
        await client.index({
            index: postIndex,
            document: newPost,
            refresh: true,
        })
        res.status(201).send({ success: "Add blog success!" })
    } catch (error) {
        res.send(error);
        console.log(error)
    }
}

const updatePost = async (req, res) => {
    const { tags, isPublish = true, title, content, slug } = req.body
    let publishedAt = "";
    if (isPublish) publishedAt = new Date();
    let coverImg = "";
    let cloudinaryId = ""
    // console.log(req.body)
    if (req.file) {
        await cloudinary.uploader.upload(
            req.file.path,
            { folder: "blog" },
            (err, result) => {
                if (err) {
                    res.status(500).json({
                        error: "Internal server error",
                    });
                }
                coverImg = result.secure_url;
                console.log(coverImg)
                cloudinaryId = result.public_id;
            }
        );
    }

    try {
        const oldPost = await getPost(slug)
        if (oldPost._id) {
            const newSlug = slugify(title)
            let Post = {
                title: title,
                slug: newSlug,
                tags: tags.split(",") || [],
                content: content,
                isPublish: isPublish,
                authorName: req.user.name,
            }

            if (coverImg && cloudinaryId) {
                Post = { ...Post, coverImg, cloudinaryId }
            }

            await client.update({
                index: postIndex,
                id: oldPost._id,
                doc: Post,
                refresh: true,
            })

            res.send({ slug: newSlug })
        } else {
            return res.status(404).send({ error: "Blog not found" });
        }
    } catch (error) {
        console.log(error);
        res.status(500).send(error)
    }
}


const getAllPost = async (req, res) => {
    const { from = 0, size = 10 } = req.query;

    try {
        const result = await client.search({
            index: postIndex,
            from: from,
            size: size,
            query: { match_all: {} },
            sort: [{ publishedAt: { order: 'desc' } }],
        });
        if (result) {
            console.log('all post', result)
            const data = result.hits.hits;
            res.send({ total: data.length, data });
            return;
        }
    } catch (error) {
        let err = error.name ? { error: error.name } : error
        res.send(err);
    }
}

const getPostBySlug = async (req, res) => {
    const { slug } = req.params;

    try {
        const result = await client.search({
            index: postIndex,
            query: {
                match: {
                    slug
                }
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

const searchPosts = async (req, res) => {
    const { q, hashtag } = req.query;
    let keyword = q;
    if (hashtag) {
        keyword = "#" + hashtag;
    }

    try {
        const result = await client.search({
            index: postIndex,
            query: {
                bool: {
                    must: {
                        multi_match: {
                            query: keyword,
                            fields: ['title^3', 'tags^2', 'content']
                        }
                    }
                },
                sort: [{ publishedAt: { order: 'asc' } }],
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

const getPostByUser = async (req, res) => {
    try {
        const result = await client.search({
            index: postIndex,
            query: {
                match: {
                    authorId: req.user.id
                }
            },
            sort: [{ publishedAt: { order: 'desc' } }],
            size: 20
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

const getPostsOfAuthor = async (req, res) => {

    try {
        const { userId, amount = 5 } = req.params;
        const result = await client.search({
            index: postIndex,
            query: {
                match: {
                    authorId: userId
                }
            },
            sort: [{ publishedAt: { order: 'desc' } }],
            size: amount,
        });
        if (result) {
            console.log(result)
            const data = result?.hits?.hits;
            res.send(data);
            return;
        }
    } catch (error) {
        let err = error.name ? { error: error.name } : error
        res.send(err);
    }
}

const listPostByTag = async (tag) => {
    let kq = []
    try {
        const result = await client.search({
            index: postIndex,
            size: 5,
            query: {
                match: {
                    tags: tag
                }
            },
        })

        kq = result?.hits?.hits.map(item => {
            return {
                _id: item._id,
                title: item._source.title,
                authorName: item._source.authorName,
                authorId: item._source.authorId,
                likes: item._source.likes,
                tags: item._source.tags,
                slug: item._source.slug,
            }
        });

    } catch (error) {
        return kq;
    }
    return kq;
}

const getPopularTagsWithPost = async (req, res) => {
    try {
        const result = await client.search({
            index: postIndex,
            size: 0,
            aggs: {
                tags: {
                    terms: {
                        field: "tags.keyword"
                    }
                }
            }
        });

        if (result?.aggregations?.tags?.buckets) {
            let tags = result.aggregations.tags.buckets.map((item) => item.key)
            tags.splice(3)

            const tag1 = await listPostByTag(tags[0])
            const tag2 = await listPostByTag(tags[1])
            const tag3 = await listPostByTag(tags[2])

            const listPosts = [
                {
                    id: 1,
                    tag: tags[0],
                    data: tag1
                },
                {
                    id: 2,
                    tag: tags[1],
                    data: tag2
                },
                {
                    id: 3,
                    tag: tags[2],
                    data: tag3
                }
            ]

            res.send(listPosts)
        }
    } catch (error) {
        console.log(error)
        let err = error.name ? { error: error.name } : error
        res.send(err);
    }
}

const getPost = async (slug) => {
    // console.log(slug)
    try {
        const result = await client.search({
            index: postIndex,
            query: {
                match: {
                    slug
                }
            }
        });
        if (result) {
            const data = result.hits.hits[0];
            return data
        }
    } catch (error) {
        // let err = error.name ? { error: error.name } : error
        // res.send(err);
        return false
    }
}

const likePost = async (req, res) => {
    const { postId, userId } = req.params;
    try {
        await client.update({
            index: 'posts',
            id: postId,
            script: {
                source: `if (ctx._source.likes.contains(params.likes)) { 
                  ctx._source.likes.remove(ctx._source.likes.indexOf(params.likes)) 
                } else {
                  ctx._source.likes.add(params.likes)}`,
                lang: 'painless',
                params: {
                    likes: userId,
                },
            },
            refresh: true,
        });
        res.send({ success: "Liked!" })
    } catch (error) {
        console.log(error)
    }
}

const getTagsOfUser = async (req, res) => {
    try {
        console.log('tag')
        const result = await client.search({
            index: postIndex,
            size: 0,
            query: {
                match: {
                    authorId: req.user.id
                }
            },
            aggs: {
                tags: {
                    terms: {
                        field: "tags.keyword"
                    }
                }
            }
        });

        if (result?.aggregations?.tags?.buckets) {
            let tags = result.aggregations.tags.buckets.map((item) => item.key)
            res.send(tags)
        }
    } catch (error) {
        console.log(error)
        let err = error.name ? { error: error.name } : error
        res.send(err);
    }
}

const deletePost = async (req, res) => {
    const { postId } = req.params;
    if (postId) {
        try {
            await client.delete({
                index: postIndex,
                id: postId,
                refresh: true,
            });
            res.send({ success: "deleted!" });
        } catch (error) {
            console.log(error)
        }
    } else {
        console.log("Post id undefined")
    }
}

export {
    newPost,
    getAllPost,
    getPostBySlug,
    searchPosts,
    getPostByUser,
    getPopularTagsWithPost,
    likePost,
    updatePost,
    getPostsOfAuthor,
    getTagsOfUser,
    deletePost,
}