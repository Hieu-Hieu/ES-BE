import generateToken from '../utils/generateToken.js';
import client from '../connection.js';
import bcrypt from 'bcryptjs';
import { v2 as cloudinary } from 'cloudinary';

const { CLOUD_NAME, API_KEY, API_SECRET } = process.env;
cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
});



const userIndex = 'users';

const registUser = async (req, res) => {
    const { email, password, name } = req.body

    try {
        const existsUser = await client.search({
            index: userIndex,
            query: {
                bool: {
                    filter: {
                        term: {
                            email: {
                                value: email
                            }
                        }
                    }
                }
            }
        })
        if (existsUser?.hits?.hits?.length > 0) {
            res.status(400).send({ error: 'Tài khoản đã tồn tại' })
        } else {
            bcrypt.hash(password, 10, async (err, hash) => {
                if (err) {
                    res.status(500).send({ error: "Internal server error" });
                }
                else {
                    let error;
                    await client.index({
                        index: userIndex,
                        document: {
                            "name": name,
                            "email": email,
                            "password": hash,
                            "avatar": "https://www.iconpacks.net/icons/2/free-user-icon-3297-thumb.png",
                            "dateCreated": Date.now(),
                            following: [],
                            follower: [],
                        }
                    })
                    res.send({ success: "Đăng ký tài khoản thành công!" });
                }
            });
        }
    } catch (error) {
        res.send(error);
        console.log(error)
    }
}

const loginUser = async (req, res) => {
    const { email, password } = req.body

    try {
        const result = await client.search({
            index: userIndex,
            query: {
                bool: {
                    must: [
                        {
                            match: {
                                email: email,
                            },
                        },
                    ],
                }
            }
        })
        const users = result.hits.hits;
        console.log('login', users)
        if (users.length === 0) {
            res.status(400).send({ error: "Tài khoản không tồn tại" })
        } else {
            console.log(users[0]._source.password)
            bcrypt.compare(password, users[0]._source.password, async (err, result) => {
                if (err) {
                    console.log(err)
                    return res.status(500).send({ error: "Internal server error" });
                }
                if (!result) {
                    return res.status(401).send({ error: "Sai mật khẩu" });
                }
                const user = {
                    name: users[0]._source.name,
                    id: users[0]._id,
                    avatar: users[0]._source.avatar,
                    token: generateToken(users[0]._id),
                }
                res.status(200).send({ ...user });
                return;
            });

        }
    } catch (error) {
        console.log(error)
        let err = error.name ? { error: error.name } : error
        res.send(err);
    }
}

const getAll = async (req, res) => {
    const { from = 0, size = 10 } = req.query;

    try {
        const result = await client.search({
            index: userIndex,
            from: from,
            size: size,
            query: { match_all: {} }
        });
        if (result) {
            const data = result.hits.hits;
            res.send({ total: data.length, data });
            return;
        } else {
            res.send({ total: 0, data: [] })
        }
    } catch (error) {
        let err = error.name ? { error: error.name } : error
        res.send(err);
    }
}

const getUserProfile = async (req, res) => {

    try {
        const user = await client.get({
            index: userIndex,
            _source_excludes: 'password',
            id: req.user.id,
        });
        let usr = user?._source;
        console.log("user profile", usr)
        if (usr) {
            res.status(200).send({ _id: req.user.id, ...usr });
        } else {
            res.status(404).send({ error: "Không tìm thấy user" })
        }
    } catch (error) {
        res.status(400).send(error);
    }
}

const searchUser = async (req, res) => {
    const query = req?.query?.query;
    //  console.log(query)
    if (query) {
        try {
            const result = await client.search({
                index: userIndex,
                query: {
                    multi_match: {
                        fields: ['name', 'email'],
                        query: query,
                    }
                },
            });
            if (result) {
                const data = result?.hits?.hits;
                res.status(200).send(data);
            }
        } catch (error) {
            console.log(error)
            let err = error.name ? { error: error.name } : error
            res.send(err);
        }
    }
}

const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await client.get({
            index: userIndex,
            _source_excludes: 'password',
            id: userId,
        })
        if (user?._source) {
            res.send(user._source);
        } else {
            res.status(404).send({ error: "Không tìm thấy user" })
        }
    } catch (error) {
        res.status(404).send(error)
    }
    return;
}

const followUser = async (req, res) => {
    try {
        const { authorId } = req.params;
        const userId = req.user.id;
        if (userId !== authorId) {
            const result = await client.update({
                index: 'users',
                id: userId,

                script: {
                    source: `if (ctx._source.following.contains(params.authorId)) { 
                    ctx._source.following.remove(ctx._source.following.indexOf(params.authorId))
                   }
                   else {
                     ctx._source.following.add(params.authorId)
                    }`,
                    lang: 'painless',
                    params: {
                        authorId: authorId,
                    },
                },
                refresh: true,
            })

            if (result) {
                res.send({ success: "Followed!" })
            }
        } else {
            res.status(400).send({ error: "You are author" })
        }
    } catch (error) {
        console.log(error)
    }
}

const getListFolowOfUser = async (req, res) => {

    try {
        const { userId } = req.params;
        const result = await client.search({
            index: userIndex,
            _source_includes: 'following',
            query: {
                bool: {
                    should: {
                        terms: {
                            _id: [userId],
                        },
                    },
                },
            },
        });

        let following = result?.hits?.hits[0]?._source?.following;
        if (following) {
            const result = await client.search({
                index: userIndex,
                _source_excludes: "password",
                query: {
                    ids: {
                        values: following
                    }
                }
            })
            res.send(result.hits.hits)
        } else {
            // res.send(result)
            res.status(404).send("Not found")
        }

    } catch (error) {
        console.log(error);
    }
}

const updateUser = (req, res) => {
    // const { userId } = req.body;
    // client.indices.putMapping({
    //     index: userIndex,
    //     id: userId,
    //     body: {
    //         following: [],
    //         follower: [],
    //     },
    //     refresh: true,
    // })
}

export { registUser, loginUser, getAll, getUserProfile, searchUser, getUserById, followUser, getListFolowOfUser, updateUser }