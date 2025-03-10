const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const archiver = require("archiver");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, "public")));

let waitingListeners = [];
let waitingVenters = [];
let activeChats = new Map();
let chatLogs = [];

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

// Daily Email Report Setup
setInterval(() => {
    if (chatLogs.length > 0) {
        const filePath = path.join(__dirname, "chat_logs.txt");
        fs.writeFileSync(filePath, JSON.stringify(chatLogs, null, 2));

        const zipPath = path.join(__dirname, "chat_logs.zip");
        const output = fs.createWriteStream(zipPath);
        const archive = archiver("zip", { zlib: { level: 9 } });
        archive.pipe(output);
        archive.append(fs.createReadStream(filePath), { name: "chat_logs.txt" });
        archive.finalize();

        output.on("close", () => sendEmail(zipPath, chatLogs.length, waitingListeners.length + waitingVenters.length));
    }
}, 86400000);

function sendEmail(zipFilePath, chatCount, unmatchedUsers) {
    let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: "your-email@gmail.com", pass: "your-email-password" }
    });

    let mailOptions = {
        from: "your-email@gmail.com",
        to: "ritvikmittal96@gmail.com",
        subject: "Daily Chat Room Report",
        text: `Total Chats: ${chatCount}\nUnmatched Users: ${unmatchedUsers}`,
        attachments: [{ filename: "chat_logs.zip", path: zipFilePath }]
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) console.error("Error sending email: ", error);
        else console.log("Email sent: ", info.response);
    });
}

server.listen(3000, () => console.log("Server running on https://chat-room-tezr.onrender.com"));
