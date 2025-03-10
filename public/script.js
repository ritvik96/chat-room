const socket = new WebSocket("wss://chat-room-tezr.onrender.com");

const chatContainer = document.getElementById("chat-container");
const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const listenerButton = document.getElementById("listener");
const venterButton = document.getElementById("venter");
const roleSelection = document.getElementById("role-selection");

let typingTimeout;

socket.onopen = () => console.log("Connected to WebSocket server.");

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "message") {
        document.getElementById("typing-indicator")?.remove(); // Remove typing indicator
        displayMessage(data.text, data.self ? "sent" : "received");
    } else if (data.type === "typing") {
        showTypingIndicator();
    }
};

listenerButton.addEventListener("click", () => joinChat("listener"));
venterButton.addEventListener("click", () => joinChat("venter"));

function joinChat(role) {
    socket.send(JSON.stringify({ type: "join", role }));
    roleSelection.classList.add("hidden");
    chatContainer.classList.remove("hidden");

    const waitingMessage = document.createElement("div");
    waitingMessage.id = "waiting-message";
    waitingMessage.textContent = role === "listener" ? "Waiting for a Venter..." : "Waiting for a Listener...";
    chatBox.appendChild(waitingMessage);
}

sendButton.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        sendMessage();
    } else {
        socket.send(JSON.stringify({ type: "typing" }));
    }
});

function sendMessage() {
    const message = messageInput.value.trim();
    if (message !== "") {
        socket.send(JSON.stringify({ type: "message", text: message }));
        messageInput.value = "";
    }
}

function displayMessage(message, type) {
    const msgElement = document.createElement("div");
    msgElement.textContent = message;
    msgElement.classList.add("message", type);
    chatBox.appendChild(msgElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function showTypingIndicator() {
    if (!document.getElementById("typing-indicator")) {
        const typingIndicator = document.createElement("div");
        typingIndicator.id = "typing-indicator";
        typingIndicator.textContent = "Typing...";
        chatBox.appendChild(typingIndicator);
    }

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        document.getElementById("typing-indicator")?.remove();
    }, 2000);
}
