import express from 'express';
const commentRouter = express.Router();
import { isAuth, isAuth2 } from '../middleware/auth.middleware.js';
import { countCommentedOfUser, getCommentByPost, newComment } from '../controllers/comment.controller.js'

commentRouter.get('/count', isAuth, countCommentedOfUser)
commentRouter.get('/:postId', getCommentByPost);
commentRouter.post('/', isAuth2, newComment);

export default commentRouter;
