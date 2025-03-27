const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const archiver = require("archiver");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, "public")));

let waitingListeners = [];
let waitingVenters = [];
let activeChats = new Map();
let chatLogs = [];

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.your_email_gmail_com,
        pass: process.env.your_email_password
    }
});

function broadcastWaitingCounts() {
    const data = {
        type: "waitingCount",
        listeners: waitingListeners.length,
        venters: waitingVenters.length
    };
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

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
                broadcastWaitingCounts();
            }
        } else if (data.type === "message") {
            let chatPartner = activeChats.get(ws);
            if (chatPartner) {
                chatPartner.send(JSON.stringify({ type: "message", text: data.text }));
                ws.send(JSON.stringify({ type: "message", text: data.text, self: true }));
                chatLogs.push({ sender: ws.role, message: data.text });
            }
        } else if (data.type === "typing") {
            let chatPartner = activeChats.get(ws);
            if (chatPartner) {
                chatPartner.send(JSON.stringify({ type: "typing" }));
            }
        }
    });

    ws.on("close", () => {
        waitingListeners = waitingListeners.filter(user => user !== ws);
        waitingVenters = waitingVenters.filter(user => user !== ws);
        broadcastWaitingCounts();

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
    broadcastWaitingCounts();
}

server.listen(3000, () => console.log("Server running on https://chat-room-tezr.onrender.com"));