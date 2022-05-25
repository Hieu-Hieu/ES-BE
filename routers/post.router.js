import express from 'express';
const postRouter = express.Router();
import { newPost, getAllPost, getPostBySlug, searchPosts, getPostByUser, getPopularTagsWithPost, likePost, updatePost, getPostsOfAuthor } from '../controllers/post.controller.js'
import multer from 'multer';
import { isAuth, isAuth2 } from '../middleware/auth.middleware.js';

const storage = multer.diskStorage({
    filename: function (req, file, cb) {
        // cb(null, file.originalname);
        cb(null, file.fieldname + '-' + Date.now())
    },
});

const upload = multer({ storage: storage });

postRouter.route('/mypost').post(isAuth, getPostByUser);
postRouter.route('/search').get(searchPosts);
postRouter.route('/tags-posts-popular').get(getPopularTagsWithPost);
// postRouter.route('/edit').post(updatePost);
postRouter.route('/like/:postId/:userId').get(isAuth2, likePost);
postRouter.get("/author/:userId/:amount", getPostsOfAuthor)
postRouter.route('/:slug').get(getPostBySlug);
postRouter.route('/')
    .get(getAllPost)
// .post(isAuth,upload.single("image"),  newPost)
postRouter.post("/", upload.single("image"), isAuth, newPost)
    .put("/", upload.single("image"), isAuth, updatePost)

export default postRouter;
