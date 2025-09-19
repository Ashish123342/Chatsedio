import { getDatabase, ref, push, remove } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { db, currentUser, userName } from './auth.js';

let pc = null;
let localStream = null;
let callListeners = [];

// Initialize WebRTC functionality
function initWebRTC() {
  // Remove any existing listeners
  callListeners.forEach(listener => listener());
  callListeners = [];
  
  // Listen for incoming calls
  const callListener = onChildAdded(ref(db, `calls/${currentUser.uid}`), async snap => {
    const c = snap.val();
    
    if (c.offer) {
      pc = new RTCPeerConnection();
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
        document.getElementById("localVideo").srcObject = localStream;

        pc.ontrack = e => document.getElementById("remoteVideo").srcObject = e.streams[0];
        pc.onicecandidate = e => {
          if (e.candidate) push(ref(db, `calls/${c.from}`), {
            from: currentUser.uid,
            fromName: userName,
            candidate: e.candidate
          });
        };

        await pc.setRemoteDescription(new RTCSessionDescription(c.offer));
        const ans = await pc.createAnswer();
        await pc.setLocalDescription(ans);
        push(ref(db, `calls/${c.from}`), {
          from: currentUser.uid,
          fromName: userName,
          answer: ans
        });

        document.getElementById("call-overlay").style.display = "flex";
        document.getElementById("call-status").innerText = `Incoming Call from ${c.fromName || c.from}`;
        document.getElementById("answerBtn").style.display = "block";
        document.getElementById("rejectBtn").style.display = "block";
        document.getElementById("endBtn").style.display = "none";
      } catch (error) {
        console.error("Error handling incoming call:", error);
      }
    }

    if (c.answer) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(c.answer));
      } catch (error) {
        console.error("Error setting remote description:", error);
      }
    }
    
    if (c.candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c.candidate));
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    }
  });
  
  callListeners.push(callListener);
}

// Initialize when user is authenticated
window.addEventListener('userAuthenticated', initWebRTC);

// Start a call
window.startCall = async function(to) {
  document.getElementById("call-overlay").style.display = "flex";
  document.getElementById("call-status").innerText = "Calling " + to;
  document.getElementById("answerBtn").style.display = "none";
  document.getElementById("rejectBtn").style.display = "none";
  document.getElementById("endBtn").style.display = "block";

  try {
    pc = new RTCPeerConnection();
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    document.getElementById("localVideo").srcObject = localStream;

    pc.ontrack = e => document.getElementById("remoteVideo").srcObject = e.streams[0];
    pc.onicecandidate = e => {
      if (e.candidate) push(ref(db, `calls/${to}`), {
        from: currentUser.uid,
        fromName: userName,
        candidate: e.candidate
      });
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    push(ref(db, `calls/${to}`), {
      from: currentUser.uid,
      fromName: userName,
      offer
    });
  } catch (error) {
    console.error("Error starting call:", error);
    endCall();
  }
};

// Answer call
document.getElementById("answerBtn").onclick = () => {
  document.getElementById("answerBtn").style.display = "none";
  document.getElementById("rejectBtn").style.display = "none";
  document.getElementById("endBtn").style.display = "block";
  document.getElementById("call-status").innerText = "In Call";
};

// End call
window.endCall = function() {
  document.getElementById("call-overlay").style.display = "none";
  if (pc) {
    pc.close();
    pc = null;
  }
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
};

document.getElementById("endBtn").onclick = endCall;
document.getElementById("rejectBtn").onclick = endCall;