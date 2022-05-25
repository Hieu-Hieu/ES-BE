import express, { Router } from 'express';
const userRouter = express.Router();
import { createUser, createUserPolicy } from '../validations/user.validation.js'
import validate from '../utils/validate.js'
import { registUser, loginUser, getAll, getUserProfile, searchUser, getUserById } from '../controllers/user.controller.js'

userRouter.get('/search', searchUser)

userRouter.post('/profile', getUserProfile)

userRouter.post('/login', loginUser)

userRouter.get('/:userId', getUserById)

userRouter.route('/').get(getAll).post(validate(createUser), registUser)


export default userRouter;
