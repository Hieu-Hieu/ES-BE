import express, { Router } from 'express';
const userRouter = express.Router();
import { registUser, loginUser, getAll, getUserProfile, searchUser, getUserById, getListFolowOfUser, updateUser, followUser } from '../controllers/user.controller.js'
import { isAuth2 } from '../middleware/auth.middleware.js';

userRouter.get('/search', searchUser)

userRouter.get('/profile', isAuth2, getUserProfile)

userRouter.post('/login', loginUser)

userRouter.get("/follow/:userId", getListFolowOfUser)

userRouter.get("/following/:authorId", isAuth2, followUser)

userRouter.get('/:userId', getUserById)

userRouter.route('/').get(getAll).post(registUser).patch(updateUser)


export default userRouter;
