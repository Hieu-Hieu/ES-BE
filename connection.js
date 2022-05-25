import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
dotenv.config();

var client = new Client({
    node: `http://${process.env.ES_USERNAME}:${process.env.ES_PASSWORD}@localhost:9200/`

});

// const client = new Client({
//     node: "http://34.202.227.22:9200",
//     auth: {
//         username: "phunghx",
//         password: 'Tu240900',
//     },
//     tls: {
//         // might be required if it's a self-signed certificate
//         rejectUnauthorized: false,
//     },
//     requestTimeout: 9999999,
// });

export default client; 