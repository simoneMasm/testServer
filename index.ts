import express from 'express';
//import { createServer } from 'https';
import { createServer } from 'http';
import 'dotenv/config'
import { Server, ServerOptions, Socket } from "socket.io";
import { ExtendedError } from 'socket.io/dist/namespace';
import * as fs from 'fs';
import cors from 'cors';

const certPath = process.env.CERT_PATH ? process.env.CERT_PATH : ""
const keyPath = process.env.KEY_PATH ? process.env.KEY_PATH : ""
const options = {
    key: fs.readFileSync(keyPath, 'utf8'),
    cert: fs.readFileSync(certPath, 'utf8'),
    //requestCert: true,
    //rejectUnauthorized: false, //per evitare errore su self signed certificate. VA USATA SOLO IN DEVELOPMENT
    //allowHTTP1: true
}

const app = express();

app.use(cors());

app.get('/', (req, res) => {
    res.send("Hello World")
})

//const server = createServer(options, app);
const server = createServer(app);

//Socket.IO Server
interface ServerToClientEvents { //listen
    status: (payload: string) => void;
    abort: () => void;
}

type ClientToServerEvents = ServerToClientEvents //emit

interface InterServerEvents { }

interface SocketData { }

const socketIO = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
    cors: {
        origin: true
    },
});

const middlewaresSockets = socketIO.of("/middlewares");
const clientsSockets = socketIO.of("/clients");

//middlewares
const authorizationMiddleware = (socket: Socket<ServerToClientEvents, ServerToClientEvents, InterServerEvents, SocketData>, next: (err?: ExtendedError | undefined) => void) => {
    if (socket.handshake.query["type"] === undefined)
        next(new Error("Client type not defined"));

    next()//verifica che il type sia definito nella query
}

socketIO.use(authorizationMiddleware);
socketIO.of("/middlewares").use(authorizationMiddleware)
socketIO.of("/clients").use(authorizationMiddleware)

middlewaresSockets.on('connection', (socket: Socket) => {
    console.log(socket.handshake.auth)

    socket.on("status", (payload: string) => {
        clientsSockets.emit("status", payload)
    })

    console.log("CLIENT CONNECTED middlewares", socket.id)
})

clientsSockets.on('connection', (socket: Socket) => {
    socket.on("abort", () => {
        middlewaresSockets.emit("abort")
    })
    console.log("CLIENT CONNECTED clients", socket.id)
})

const port = process.env.SERVER_LISTENING_PORT ? process.env.SERVER_LISTENING_PORT : "8080"
server.listen(port, () => { console.log("Listening on port", port) });