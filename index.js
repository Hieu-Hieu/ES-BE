import express from 'express';
import client from './connection.js';
import { api } from './routers/index.js';
import cors from 'cors';

const app = express();

// parse json request body
app.use(express.json());

app.use(cors())

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

app.use('/api', api);

app.listen(5000, () => console.log('server running at 5000'));
