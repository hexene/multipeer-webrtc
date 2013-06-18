// WRTCPeer: one object corresponds to one peer in the call
function WRTCPeer(peerID, peerChannel, localStream, sendCallback, setVideoCallback, removeVideoCallback, logCallback) {
    this.init(peerID, peerChannel, localStream, sendCallback, setVideoCallback, removeVideoCallback, logCallback);
}

WRTCPeer.prototype.init = function (peerID, peerChannel, localStream, sendCallback, setVideoCallback, removeVideoCallback, logCallback) {
    this.peerID = peerID;                             // unique peer ID
    this.peerChannel = peerChannel;                   // channel local to peer
    this.localStream = localStream;                   // local MediaStream
    this.sendCallback = sendCallback;                 // message send callback
    this.setVideoCallback = setVideoCallback;         // video render callback
    this.removeVideoCallback = removeVideoCallback;   // remove video callback
    this.logCallback = logCallback                    // log callback
    this.remoteStream = null;                         // remote MediaStream
    this.peerConnection = null;                       // RTCPeerConnection for the peer
    this.localDescription = null;                     // local SDP description
    this.lastHeartbeat = 0;                           // inverted watchdog timer counter
    this.heartbeatInterval = null;                    // watchdog timer method identifier (used to cancel the timer)
}

WRTCPeer.prototype.startConnection = function() {
    this.logCallback(this.peerID + ": peer startConnection");
    try {
        // Try with TURN later
        this.peerConnection = new webkitRTCPeerConnection({"iceServers": [{"url": "stun:stun.l.google.com:19302"}]});    
        this.peerConnection.onicecandidate = this.getOnIceCandidate(this);
        this.peerConnection.onaddstream = this.getOnAddStream(this);
        this.peerConnection.onremovestream = this.getOnRemoveStream(this);
        this.peerConnection.addStream(localStream);
    } catch (e) {
        console.log("Failed to create PeerConnection, exception: " + e.message);
        return -1;
    }
    return 0;
}
    
WRTCPeer.prototype.createOffer = function() {
    this.logCallback(this.peerID + ": peer createOffer");
    this.peerConnection.createOffer(this.getSetDescription(this));
}

WRTCPeer.prototype.sendMessage = function(message) {
    this.logCallback(this.peerID + ": peer sendMessage");
    this.sendCallback(this.peerChannel, message);
}

WRTCPeer.prototype.processMessage = function(message) {
    this.logCallback(this.peerID + ": peer processMessage" + JSON.stringify(message));
    if (message.sdp) {
        this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp));
        if (message.sdp.type === "offer") {
            this.peerConnection.createAnswer(this.getSetDescription(this));
        }
    } else if (message.candidate) {
        this.peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
    }
}

// Callback Creation Methods
WRTCPeer.prototype.getOnIceCandidate = function(curObject) {
    return function(event) {
        curObject.logCallback(curObject.peerID + ": peer processIceCandidate");
        if (event.candidate) {
           curObject.sendMessage({candidate: event.candidate});
        } else {
           curObject.logCallback(curObject.peerID + ": End of candidates.");
        }
    };
}

WRTCPeer.prototype.getOnAddStream = function(curObject) {
    return function(event) {
        curObject.logCallback(curObject.peerID + ": peer onaddstream");
        curObject.remoteStream = event.stream;
        curObject.setVideoCallback(curObject.peerID, window.webkitURL.createObjectURL(event.stream));
    };
}

WRTCPeer.prototype.getOnRemoveStream = function(curObject) {
    return function(event) {
        curObject.logCallback(curObject.peerID + ": peer onremovestream");
        curObject.remoteStream = null;
        curObject.removeVideoCallback(peerID);
    };
}

WRTCPeer.prototype.getSetDescription = function(curObject) {
    return function(desc) {
        curObject.logCallback(curObject.peerID + ": peer setdescription");
        curObject.localDescription = desc;
        curObject.peerConnection.setLocalDescription(desc);
        curObject.sendMessage({ sdp : desc});
    };
};

WRTCPeer.prototype.close = function() {
    this.peerConnection.close();
    this.peerConnection = null;
}