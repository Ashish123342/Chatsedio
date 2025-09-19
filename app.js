import { getDatabase, ref, onChildAdded, remove, set } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { db, currentUser, userName } from './auth.js';

let chatWith = null;
let chatWithName = null;

// Initialize app when user is authenticated
window.addEventListener('userAuthenticated', (e) => {
  const { user, userName } = e.detail;
  loadPeople();
  listenRequests();
  listenChats();
});

// Handle name updates
window.addEventListener('userNameUpdated', (e) => {
  const newName = e.detail;
  document.getElementById('user-name-display').textContent = `Name: ${newName}`;
});

// 🔹 Tabs
Array.from(document.querySelectorAll('#tabs button')).forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('#tabs button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(btn.dataset.view).classList.add('active');
  };
});

// 🔹 People List
function loadPeople() {
  const peopleContainer = document.getElementById("people");
  peopleContainer.innerHTML = ""; // Clear existing content
  
  onChildAdded(ref(db, "users"), snap => {
    const u = snap.val();
    if (u.uid === currentUser.uid) return;

    const div = document.createElement("div");
    div.className = "user-item";
    div.innerHTML = `<span>${u.name || u.uid}</span><button>Add</button>`;
    div.querySelector("button").onclick = () => sendRequest(u.uid);
    peopleContainer.appendChild(div);
  });
}

function sendRequest(to) {
  set(ref(db, `requests/${to}/${currentUser.uid}`), {
    from: currentUser.uid,
    fromName: userName
  });
  alert("Request sent");
}

// 🔹 Friend Requests + Friends
function listenRequests() {
  const friendsContainer = document.getElementById("friends");
  friendsContainer.innerHTML = ""; // Clear existing content
  
  onChildAdded(ref(db, `requests/${currentUser.uid}`), snap => {
    const r = snap.val();
    const div = document.createElement("div");
    div.className = "friend-item";
    div.innerHTML = `Request from ${r.fromName || r.from}<button>Accept</button><button>Reject</button>`;
    div.querySelectorAll("button")[0].onclick = () => {
      set(ref(db, `friends/${currentUser.uid}/${r.from}`), {
        uid: r.from,
        name: r.fromName
      });
      set(ref(db, `friends/${r.from}/${currentUser.uid}`), {
        uid: currentUser.uid,
        name: userName
      });
      remove(ref(db, `requests/${currentUser.uid}/${r.from}`));
      alert("Accepted");
    };
    div.querySelectorAll("button")[1].onclick = () => remove(ref(db, `requests/${currentUser.uid}/${r.from}`));
    friendsContainer.appendChild(div);
  });
}

// 🔹 Chats
function listenChats() {
  const chatsContainer = document.getElementById("chats");
  chatsContainer.innerHTML = ""; // Clear existing content
  
  onChildAdded(ref(db, `friends/${currentUser.uid}`), snap => {
    const f = snap.val();
    const div = document.createElement("div");
    div.className = "chat-item";
    div.innerHTML = `Friend: ${f.name || f.uid}<button>Chat</button><button>Call</button>`;
    div.querySelector("button").onclick = () => openChat(f.uid, f.name);
    div.querySelectorAll("button")[1].onclick = () => startCall(f.uid);
    chatsContainer.appendChild(div);
  });
}

function openChat(uid, friendName) {
  chatWith = uid;
  chatWithName = friendName;
  document.getElementById("app").style.display = "none";
  document.getElementById("chat-box").style.display = "flex";
  document.getElementById("chat-with-name").innerText = friendName || uid;
  
  // Dispatch event for chat.js to handle
  window.dispatchEvent(new CustomEvent('openChat', {
    detail: { chatWith: uid, chatWithName: friendName }
  }));
}

// Back button functionality
document.getElementById("back-btn").onclick = () => {
  document.getElementById("chat-box").style.display = "none";
  document.getElementById("app").style.display = "flex";
  
  // Dispatch event for chat.js to handle
  window.dispatchEvent(new CustomEvent('closeChat'));
};

// Export for use in other modules
export { chatWith, chatWithName, openChat };