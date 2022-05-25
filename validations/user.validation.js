import Joi from 'joi';
import uniqid from 'uniqid';

const pick = (object, keys) => {
    return keys.reduce((obj, key) => {
        if (object && Object.prototype.hasOwnProperty.call(object, key)) {
            // eslint-disable-next-line no-param-reassign
            obj[key] = object[key];
        }
        return obj;
    }, {});
};

const createUserPolicy = (req, res, next) => {
    const userShema = Joi.object({
        id: Joi.string().required().default(uniqid()),
        username: Joi.string().required(),
        email: Joi.string().required().email(),
        password: Joi.string().required(),
        name: Joi.string().required(),
        dateCreated: Joi.date().timestamp().default(Date.now())
        // password: Joi.string()
        //     .pattern(new RegExp('^[a-zA-Z0-9]{3,30}$')),
    });

    // const { username, email, password, name } = req.body
    // const { error } = userShema.validate({ username, email, password, name });
    // const value = userShema.validate({ username, email, password, name });
    // // console.log(value)
    // if (error) {
    //     switch (error.details[0].context.key) {
    //         case "title":
    //             res.status(500).json({ message: error.details[0].message });
    //             break;
    //         case "content":
    //             res.status(500).json({ message: error.details[0].message });
    //             break;
    //         default:
    //             res.status(500).json({ message: "An error occurred." });
    //             break;
    //     }
    // }
    const validSchema = pick(userShema, ['params', 'query', 'body']);
    const object = pick(req, Object.keys(validSchema));
    const { value, error } = Joi.compile(userShema)
        .prefs({ errors: { label: 'key' }, abortEarly: false })
        .validate(object);
    if (error) {
        const errorMessage = error.details.map((details) => details.message).join(', ');
        // let d = new Error()
        return next(error)
    }
    Object.assign(req, value);
    return next();
};

const createUser = {
    body: Joi.object().keys({
        // username: Joi.string().required(),
        email: Joi.string().required().email(),
        password: Joi.string().required(),
        name: Joi.string().required(),
    }).unknown(),
};

const getUsers = {
    query: Joi.object().keys({
        name: Joi.string(),
        role: Joi.string(),
        sortBy: Joi.string(),
        limit: Joi.number().integer(),
        page: Joi.number().integer(),
    }),
};

const getUser = {
    params: Joi.object().keys({
        userId: Joi.string(),
    }),
};

const updateUser = {
    params: Joi.object().keys({
        userId: Joi.required(),
    }),
    body: Joi.object()
        .keys({
            email: Joi.string().email(),
            password: Joi.string(),
            name: Joi.string(),
        })
        .min(1),
};

const deleteUser = {
    params: Joi.object().keys({
        userId: Joi.string(),
    }),
};

export {
    createUser,
    getUsers,
    getUser,
    updateUser,
    deleteUser,
    createUserPolicy,
};