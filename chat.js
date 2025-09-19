import { getDatabase, ref, onChildAdded, push, remove } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { db, currentUser } from './auth.js';

let chatWith = null;
let chatWithName = null;
let messageListeners = [];

// Handle opening a chat
window.addEventListener('openChat', (e) => {
  const { chatWith: uid, chatWithName: name } = e.detail;
  chatWith = uid;
  chatWithName = name;
  
  const msgDiv = document.getElementById("messages");
  msgDiv.innerHTML = "";
  
  // Remove any existing listeners
  messageListeners.forEach(listener => listener());
  messageListeners = [];
  
  // Listen for incoming messages
  const incomingListener = onChildAdded(ref(db, `messages/${chatWith}/${currentUser.uid}`), snap => {
    const m = snap.val();
    addMsg(m.text, "other", m.timestamp);
  });
  messageListeners.push(incomingListener);
  
  // Listen for outgoing messages
  const outgoingListener = onChildAdded(ref(db, `messages/${currentUser.uid}/${chatWith}`), snap => {
    const m = snap.val();
    addMsg(m.text, "me", m.timestamp, snap.key);
  });
  messageListeners.push(outgoingListener);
});

// Handle closing a chat
window.addEventListener('closeChat', () => {
  // Remove all message listeners
  messageListeners.forEach(listener => listener());
  messageListeners = [];
  chatWith = null;
  chatWithName = null;
});

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function addMsg(text, cls, timestamp, key) {
  const container = document.createElement("div");
  container.className = "msg-container " + cls;

  const msgDiv = document.createElement("div");
  msgDiv.className = "msg " + cls;
  msgDiv.innerText = text;

  const timeDiv = document.createElement("div");
  timeDiv.className = "msg-time";
  timeDiv.innerText = formatTime(timestamp);

  msgDiv.appendChild(timeDiv);
  container.appendChild(msgDiv);

  if (cls === "me" && key) {
    let pressTimer;
    container.onmousedown = () => {
      pressTimer = setTimeout(() => {
        remove(ref(db, `messages/${currentUser.uid}/${chatWith}/${key}`));
        container.remove();
      }, 800); // long press 800ms
    };
    container.onmouseup = () => clearTimeout(pressTimer);
    container.onmouseleave = () => clearTimeout(pressTimer);
  }

  const messagesContainer = document.getElementById("messages");
  messagesContainer.appendChild(container);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send message functionality
document.getElementById("sendBtn").onclick = () => {
  const val = document.getElementById("msgInput").value;
  if (!val || !chatWith) return;
  
  push(ref(db, `messages/${currentUser.uid}/${chatWith}`), {
    text: val,
    timestamp: Date.now()
  });
  
  document.getElementById("msgInput").value = "";
};

// Allow sending messages with Enter key
document.getElementById("msgInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    document.getElementById("sendBtn").click();
  }
});