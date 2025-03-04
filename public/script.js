const socket = new WebSocket("ws://localhost:3000");

const chatContainer = document.getElementById("chat-container");
const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const listenerButton = document.getElementById("listener");
const venterButton = document.getElementById("venter");
const roleSelection = document.getElementById("role-selection");

socket.onopen = () => console.log("Connected to WebSocket server.");

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "message") {
        displayMessage(data.text, data.self ? "sent" : "received");
    }
};

// Handle role selection
listenerButton.addEventListener("click", () => joinChat("listener"));
venterButton.addEventListener("click", () => joinChat("venter"));

function joinChat(role) {
    socket.send(JSON.stringify({ type: "join", role }));
    roleSelection.classList.add("hidden");
    chatContainer.classList.remove("hidden");
}

// Send message on button click
sendButton.addEventListener("click", sendMessage);

// Send message when pressing "Enter"
messageInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        sendMessage();
    }
});

function sendMessage() {
    const message = messageInput.value.trim();
    if (message !== "") {
        socket.send(JSON.stringify({ type: "message", text: message }));
        messageInput.value = "";
    }
}

// Function to display messages
function displayMessage(message, type) {
    const msgElement = document.createElement("div");
    msgElement.textContent = message;
    msgElement.classList.add(type);
    chatBox.appendChild(msgElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}
