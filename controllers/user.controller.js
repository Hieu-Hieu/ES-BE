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
            body: {
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
            }
        })
        if (existsUser?.body?.hits?.hits?.length > 0) {
            res.status(400).send({ error: 'Tài khoản đã tồn tại' })
        } else {
            bcrypt.hash(password, 10, async (err, hash) => {
                if (err) {
                    res.status(500).send({ error: "Internal server error" });
                }
                else {
                    let error;
                    client.index({
                        index: userIndex,
                        body: {
                            "name": name,
                            "email": email,
                            "password": hash,
                            "avatar": "https://www.iconpacks.net/icons/2/free-user-icon-3297-thumb.png",
                            "dateCreated": Date.now(),
                            following: [],
                            follower: [],
                        }
                    }, function (err, resp) {
                        if (resp?.body) {
                            res.send({ success: "Đăng ký tài khoản thành công!" });
                            console.log(resp.body);
                            return;
                        } else if (err) {
                            error = err;
                            res.status(404).send({ error: error.name });
                            return;
                        }
                        console.log(resp)
                    });
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
            body: {
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
            }
        })
        const users = result.body.hits.hits;
        console.log(users)
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
            body: {
                query: { match_all: {} }
            },

        });
        if (result?.body) {
            const data = result.body.hits.hits;
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
        let usr = user?.body?._source;
        if (usr) {
            res.status(200).send({ _id: req.user.id, ...usr });
        } else {
            res.status(404).send({ error: "Không tìm thấy user" })
        }
    } catch (error) {
        res.status(404).send(error);
    }
}

const searchUser = async (req, res) => {
    const query = req?.query?.query;
    //  console.log(query)
    if (query) {
        try {
            const result = await client.search({
                index: userIndex,
                body: {
                    query: {
                        multi_match: {
                            fields: ['name', 'email'],
                            query: query,
                        }
                    },
                }
            });
            if (result) {
                const data = result?.body?.hits?.hits;
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
        if (user?.body?._source) {
            res.send(user.body._source);
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
                body: {
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
        client.search({
            index: userIndex,
            _source_includes: 'following',
            body: {
                query: {
                    bool: {
                        should: {
                            terms: {
                                _id: [userId],
                            },
                        },
                    },
                },
            }
        }, (err, result) => {
            if (err) {
                res.send(err)
            } else {
                let following = result?.body?.hits?.hits[0]?._source?.following;
                if (following) {
                    client.search({
                        index: userIndex,
                        _source_excludes: "password",
                        body: {
                            query: {
                                ids: {
                                    values: following
                                }
                            }
                        },
                    }, (err, resp) => {
                        if (err) {
                            res.send(err);
                        }
                        if (resp) {
                            res.send(resp.body.hits.hits)
                        }
                    })
                } else {
                    // res.send(result)
                    res.status(404).send("Not found")
                }
            }
        })
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