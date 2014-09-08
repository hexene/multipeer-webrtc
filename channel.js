var messageMap = {};
var MAX_MESSAGE_LENGTH = 600;

var pubnub = PUBNUB.init({
    publish_key   : 'pub-c-0b7da178-625c-4a8e-9546-9e3fb8efad88', // Use your publish api key
    subscribe_key : 'sub-c-d01c0dee-3718-11e4-9f47-02ee2ddab7fe'  // Use your subsribe api key
});

// send message on channel
function sendOnChannel(channel, message, logCallback) {
    var strMessage = JSON.stringify(message);
    logCallback("msg send: " + strMessage);
    if (strMessage.length > MAX_MESSAGE_LENGTH) { // split into chunks
        var msg_uuid = uuid.v4(); // depends on uuid.js
        while (strMessage.length > MAX_MESSAGE_LENGTH) {
            var subMessage = strMessage.substring(0, MAX_MESSAGE_LENGTH);
            var multiPartIntermediate = JSON.stringify({multipart : msg_uuid, payload : subMessage});
            pubnub.publish({channel : channel, message : multiPartIntermediate});
            strMessage = strMessage.substring(MAX_MESSAGE_LENGTH, strMessage.length);
        }
        var multiPartLast = JSON.stringify({multipart : msg_uuid, payload : strMessage, last : true});
        pubnub.publish({channel : channel, message : multiPartLast});
    } else {
        pubnub.publish({channel : channel, message : strMessage});
    }
}

// listen on channel
function listen(channel, processMessageCallback, logCallback) {
    pubnub.subscribe({channel : channel, message : function(m){ processMessageOnChannel(m, processMessageCallback, logCallback); }});
    logCallback("listen: " + channel);
}

// message processing callback
function processMessageOnChannel(strMessage, processMessageCallback, logCallback) {
    logCallback("msg recv: " + strMessage);
    var jsonMessage = JSON.parse(strMessage);
    if (jsonMessage.multipart) { // combine if a multipart message
        !messageMap[jsonMessage.multipart] && (messageMap[jsonMessage.multipart] = []);
        messageMap[jsonMessage.multipart].push(jsonMessage.payload);
        if (jsonMessage.last) { // call actual processing callback
            var combinedMessage = JSON.parse(messageMap[jsonMessage.multipart].join(""));
            delete messageMap[jsonMessage.multipart];
            processMessageCallback(combinedMessage);
        }
    } else {
        processMessageCallback(jsonMessage);
    }
}
