// app.js - Fixed version
import { getDatabase, ref, onChildAdded, onValue, remove, set, off } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { db, currentUser, userName } from './auth.js';

let chatWith = null;
let chatWithName = null;
let peopleListener = null;
let requestsListener = null;
let chatsListener = null;

// Initialize app when user is authenticated
window.addEventListener('userAuthenticated', (e) => {
  const { user, userName } = e.detail;
  
  // Remove any existing listeners
  if (peopleListener) off(peopleListener);
  if (requestsListener) off(requestsListener);
  if (chatsListener) off(chatsListener);
  
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
  peopleContainer.innerHTML = "<div class='loading'>Loading people...</div>";
  
  // Set up listener for people
  peopleListener = ref(db, "users");
  onValue(peopleListener, (snapshot) => {
    const users = snapshot.val();
    peopleContainer.innerHTML = "";
    
    if (!users) {
      peopleContainer.innerHTML = "<div class='no-data'>No users found</div>";
      return;
    }
    
    Object.entries(users).forEach(([uid, userData]) => {
      if (uid === currentUser.uid) return;
      
      const div = document.createElement("div");
      div.className = "user-item";
      div.innerHTML = `<span>${userData.name || uid}</span><button>Add</button>`;
      div.querySelector("button").onclick = () => sendRequest(uid, userData.name);
      peopleContainer.appendChild(div);
    });
  });
}

function sendRequest(to, toName) {
  set(ref(db, `requests/${to}/${currentUser.uid}`), {
    from: currentUser.uid,
    fromName: userName,
    to: to,
    toName: toName,
    timestamp: Date.now()
  });
  alert("Request sent to " + toName);
}

// 🔹 Friend Requests + Friends
function listenRequests() {
  const requestsContainer = document.getElementById("friends");
  requestsContainer.innerHTML = "<div class='loading'>Loading requests...</div>";
  
  // Set up listener for requests
  requestsListener = ref(db, `requests/${currentUser.uid}`);
  onValue(requestsListener, (snapshot) => {
    const requests = snapshot.val();
    requestsContainer.innerHTML = "";
    
    if (!requests) {
      requestsContainer.innerHTML = "<div class='no-data'>No friend requests</div>";
      return;
    }
    
    Object.entries(requests).forEach(([fromUid, requestData]) => {
      const div = document.createElement("div");
      div.className = "friend-item";
      div.innerHTML = `Request from ${requestData.fromName || fromUid}<button>Accept</button><button>Reject</button>`;
      
      div.querySelectorAll("button")[0].onclick = () => {
        // Add to friends list for both users
        set(ref(db, `friends/${currentUser.uid}/${fromUid}`), {
          uid: fromUid,
          name: requestData.fromName
        });
        
        set(ref(db, `friends/${fromUid}/${currentUser.uid}`), {
          uid: currentUser.uid,
          name: userName
        });
        
        // Remove the request
        remove(ref(db, `requests/${currentUser.uid}/${fromUid}`));
        alert("Friend request accepted");
      };
      
      div.querySelectorAll("button")[1].onclick = () => {
        remove(ref(db, `requests/${currentUser.uid}/${fromUid}`));
        alert("Friend request rejected");
      };
      
      requestsContainer.appendChild(div);
    });
  });
}

// 🔹 Chats
function listenChats() {
  const chatsContainer = document.getElementById("chats");
  chatsContainer.innerHTML = "<div class='loading'>Loading chats...</div>";
  
  // Set up listener for friends (chats)
  chatsListener = ref(db, `friends/${currentUser.uid}`);
  onValue(chatsListener, (snapshot) => {
    const friends = snapshot.val();
    chatsContainer.innerHTML = "";
    
    if (!friends) {
      chatsContainer.innerHTML = "<div class='no-data'>No friends yet</div>";
      return;
    }
    
    Object.entries(friends).forEach(([friendUid, friendData]) => {
      const div = document.createElement("div");
      div.className = "chat-item";
      div.innerHTML = `Friend: ${friendData.name || friendUid}<button>Chat</button><button>Call</button>`;
      
      div.querySelectorAll("button")[0].onclick = () => openChat(friendUid, friendData.name);
      div.querySelectorAll("button")[1].onclick = () => startCall(friendUid);
      
      chatsContainer.appendChild(div);
    });
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
  
  // Remove any chat listeners
  window.dispatchEvent(new CustomEvent('closeChat'));
};

// Export for use in other modules
export { chatWith, chatWithName, openChat };