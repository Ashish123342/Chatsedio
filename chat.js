import { getDatabase, ref, onChildAdded, push, remove, onChildRemoved } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { db, currentUser } from './auth.js';

let chatWith = null;
let chatWithName = null;
let messageListeners = [];
let messagesMap = new Map(); // Store messages with their keys

// Handle opening a chat
window.addEventListener('openChat', (e) => {
  const { chatWith: uid, chatWithName: name } = e.detail;
  chatWith = uid;
  chatWithName = name;
  
  const msgDiv = document.getElementById("messages");
  msgDiv.innerHTML = "";
  messagesMap.clear();
  
  // Remove any existing listeners
  messageListeners.forEach(listener => listener());
  messageListeners = [];
  
  // Listen for incoming messages
  const incomingListener = onChildAdded(ref(db, `messages/${chatWith}/${currentUser.uid}`), snap => {
    const m = snap.val();
    messagesMap.set(snap.key, { ...m, direction: "other", key: snap.key });
    renderMessages();
  });
  messageListeners.push(incomingListener);
  
  // Listen for outgoing messages
  const outgoingListener = onChildAdded(ref(db, `messages/${currentUser.uid}/${chatWith}`), snap => {
    const m = snap.val();
    messagesMap.set(snap.key, { ...m, direction: "me", key: snap.key });
    renderMessages();
  });
  messageListeners.push(outgoingListener);
  
  // Listen for message deletions
  const incomingRemovedListener = onChildRemoved(ref(db, `messages/${chatWith}/${currentUser.uid}`), snap => {
    messagesMap.delete(snap.key);
    renderMessages();
  });
  messageListeners.push(incomingRemovedListener);
  
  const outgoingRemovedListener = onChildRemoved(ref(db, `messages/${currentUser.uid}/${chatWith}`), snap => {
    messagesMap.delete(snap.key);
    renderMessages();
  });
  messageListeners.push(outgoingRemovedListener);
});

// Handle closing a chat
window.addEventListener('closeChat', () => {
  // Remove all message listeners
  messageListeners.forEach(listener => listener());
  messageListeners = [];
  messagesMap.clear();
  chatWith = null;
  chatWithName = null;
});

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Render all messages in correct order
function renderMessages() {
  const messagesContainer = document.getElementById("messages");
  messagesContainer.innerHTML = "";
  
  // Convert map to array and sort by timestamp
  const sortedMessages = Array.from(messagesMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  
  sortedMessages.forEach(msg => {
    const container = document.createElement("div");
    container.className = `msg-container ${msg.direction}`;

    const msgDiv = document.createElement("div");
    msgDiv.className = `msg ${msg.direction}`;
    msgDiv.innerText = msg.text;

    const timeDiv = document.createElement("div");
    timeDiv.className = "msg-time";
    timeDiv.innerText = formatTime(msg.timestamp);

    msgDiv.appendChild(timeDiv);
    container.appendChild(msgDiv);

    if (msg.direction === "me" && msg.key) {
      let pressTimer;
      container.onmousedown = () => {
        pressTimer = setTimeout(() => {
          if (confirm("Delete this message?")) {
            remove(ref(db, `messages/${currentUser.uid}/${chatWith}/${msg.key}`));
          }
        }, 800); // long press 800ms
      };
      container.onmouseup = () => clearTimeout(pressTimer);
      container.onmouseleave = () => clearTimeout(pressTimer);
    }

    messagesContainer.appendChild(container);
  });
  
  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send message functionality
document.getElementById("sendBtn").onclick = sendMessage;

// Allow sending messages with Enter key
document.getElementById("msgInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});

function sendMessage() {
  const val = document.getElementById("msgInput").value.trim();
  if (!val || !chatWith) return;
  
  push(ref(db, `messages/${currentUser.uid}/${chatWith}`), {
    text: val,
    timestamp: Date.now()
  });
  
  document.getElementById("msgInput").value = "";
}