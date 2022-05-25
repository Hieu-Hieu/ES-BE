import express from 'express';
import userRouter from './user.router.js';
import postRouter from './post.router.js';
import commentRouter from './comment.router.js';

const router = express.Router();

router.use('/user', userRouter);

router.use('/post', postRouter);

router.use('/comment', commentRouter);

export const api = router;