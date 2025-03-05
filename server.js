const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, "public")));

let waitingListeners = [];
let waitingVenters = [];
let activeChats = new Map();

wss.on("connection", (ws) => {
    ws.on("message", (message) => {
        const data = JSON.parse(message);

        if (data.type === "join") {
            ws.role = data.role;

            if (ws.role === "listener" && waitingVenters.length > 0) {
                let venter = waitingVenters.shift();
                createChat(ws, venter);
            } else if (ws.role === "venter" && waitingListeners.length > 0) {
                let listener = waitingListeners.shift();
                createChat(listener, ws);
            } else {
                if (ws.role === "listener") waitingListeners.push(ws);
                else waitingVenters.push(ws);
            }
        } else if (data.type === "message") {
            let chatPartner = activeChats.get(ws);
            if (chatPartner) {
                chatPartner.send(JSON.stringify({ type: "message", text: data.text }));
                ws.send(JSON.stringify({ type: "message", text: data.text, self: true }));
            }
        }
    });

    ws.on("close", () => {
        waitingListeners = waitingListeners.filter(user => user !== ws);
        waitingVenters = waitingVenters.filter(user => user !== ws);

        let chatPartner = activeChats.get(ws);
        if (chatPartner) {
            chatPartner.send(JSON.stringify({ type: "message", text: "Your partner has disconnected." }));
            activeChats.delete(chatPartner);
        }
        activeChats.delete(ws);
    });
});

function createChat(listener, venter) {
    activeChats.set(listener, venter);
    activeChats.set(venter, listener);

    listener.send(JSON.stringify({ type: "message", text: "Connected to a Venter!" }));
    venter.send(JSON.stringify({ type: "message", text: "Connected to a Listener!" }));
}

server.listen(3000, () => console.log("Server running on https://chat-room-tezr.onrender.com"));
