// Engine for the Skype-like system
// By Rocah Cruz

var msgId;
var numberOfKeys = 0;

function getElement(selector) {
    return document.querySelector(selector);
}

var numbersOfUsers = getElement('.numbers-of-users');

numbersOfUsers.innerHTML = 1;

// ......................................................
// ..................RTCMultiConnection Code.............
// ......................................................
const connection = new RTCMultiConnection();
// Auto translate texts to chosen language
//connection.autoTranslateText = false;

window.addEventListener('load', function() {
    window.enableAdapter = true; // enable adapter.js

    //startCounter(); // time spent in room

    // by default, socket.io server is assumed to be deployed on your own URL
    //connection.socketURL = '/';
    // comment-out below line if you do not have your own socket.io server
    connection.socketURL = 'https://rtcmulticonnection.herokuapp.com:443/';

    connection.socketMessageEvent = 'audio-video-file-chat';
    connection.enableFileSharing = true; // by default, it is "false".
    connection.chunkSize = 60 * 1000;
    connection.fileReceived = {};
    connection.session = {
        audio: true,
        video: true,
        data: true,
        oneway: true
    };
    connection.sdpConstraints.mandatory = {
        OfferToReceiveAudio: true,
        OfferToReceiveVideo: true
    };

    connection.videosContainer = document.getElementById('videos-container');
    connection.onstream = function(event) {
        event.mediaElement.removeAttribute('src');
        event.mediaElement.removeAttribute('srcObject');
        var video = document.createElement('video');
        video.controls = true;
        if (event.type === 'local') {
            video.muted = true;
        }
        video.srcObject = event.stream;
        var width = parseInt(connection.videosContainer.clientWidth / 2) - 20;
        var mediaElement = getHTMLMediaElement(video, {
            title: event.userid,
            buttons: ['full-screen'],
            width: width,
            showOnMouseEnter: false
        });
        connection.videosContainer.appendChild(mediaElement);
        setTimeout(function() {
            mediaElement.media.play();
        }, 5000);
        mediaElement.id = event.streamid;
    };
    connection.onstreamended = function(event) {
        var mediaElement = document.getElementById(event.streamid);
        if (mediaElement) {
            mediaElement.parentNode.removeChild(mediaElement);
        }
    };
    connection.filesContainer = document.getElementById('file-container');
    connection.onopen = function(e) {
        document.getElementById('share-file').disabled = false;
        document.getElementById('input-text-chat').disabled = false;
        document.getElementById('btn-leave-room').disabled = false;
        numbersOfUsers.innerHTML = parseInt(numbersOfUsers.innerHTML) + 1;
        userlog();
        showSnackBar("Connected to the chat server with " + e.extra.username, 8000);
        /* showSnackBar("You are connected with: " + connection.getAllParticipants().join(', '), 8000); */
        /* document.querySelector('h1').innerHTML = 'You are connected with: ' + connection.getAllParticipants().join(', '); */
        connection.send(JSON.stringify({
            action: 'newSub',
            room: roomid
        }));
    };
    connection.onleave = function(e) {
        userlog();
        showSnackBar(e.extra.username + " left the room.", 8000);
        if (connection.getAllParticipants().length == 0) {
            connection.send(JSON.stringify({
                action: 'imOffline',
                room: roomid
            }));
        }
    };
    connection.onclose = function() {
        if (connection.getAllParticipants().length) {
            showSnackBar('You are still connected with: ' + connection.getAllParticipants().join(', '), 8000);
            /* document.querySelector('h1').innerHTML = 'You are still connected with: ' + connection.getAllParticipants().join(', '); */
        } else {
            showSnackBar('Seems session has been closed or all participants left.', 8000);
            /* document.querySelector('h1').innerHTML = 'Seems session has been closed or all participants left.'; */
            connection.send(JSON.stringify({
                action: 'imOffline',
                room: roomid
            }));
        }
        userlog();
    };
    connection.onEntireSessionClosed = function(event) {
        document.getElementById('share-file').disabled = true;
        document.getElementById('input-text-chat').disabled = true;
        document.getElementById('btn-leave-room').disabled = true;
        document.getElementById('open-or-join-room').disabled = false;
        document.getElementById('open-room').disabled = false;
        document.getElementById('join-room').disabled = false;
        document.getElementById('room-id').disabled = false;
        document.getElementById('your-name').disabled = false;
        connection.attachStreams.forEach(function(stream) {
            stream.stop();
        });
        // don't display alert for moderator
        if (connection.userid === event.userid) return;
        showSnackBar("Entire session has been closed by the moderator: " + event.extra.username, 10000);
        /* document.querySelector('h1').innerHTML = 'Entire session has been closed by the moderator: ' + event.userid; */
    };
    connection.onUserIdAlreadyTaken = function(useridAlreadyTaken, yourNewUserId) {
        // seems room is already opened
        connection.join(useridAlreadyTaken);
    };

    function disableInputButtons() {
        document.getElementById('open-or-join-room').disabled = true;
        document.getElementById('open-room').disabled = true;
        document.getElementById('join-room').disabled = true;
        document.getElementById('room-id').disabled = true;
        document.getElementById('your-name').disabled = true;
    }
    // ......................................................
    // ......................Handling Room-ID................
    // ......................................................
    function showRoomURL(roomid) {
        var roomHashURL = '#' + roomid;
        var roomQueryStringURL = '?roomid=' + roomid;
        var html = '<h2>Unique URL for your room:</h2><br>';
        html += 'Hash URL: <a href="' + roomHashURL + '" target="_blank">' + roomHashURL + '</a>';
        html += '<br>';
        html += 'QueryString URL: <a href="' + roomQueryStringURL + '" target="_blank">' + roomQueryStringURL + '</a>';
        var roomURLsDiv = document.getElementById('room-urls');
        roomURLsDiv.innerHTML = html;
        roomURLsDiv.style.display = 'block';
    }
    (function() {
        var params = {},
            r = /([^&=]+)=?([^&]*)/g;

        function d(s) {
            return decodeURIComponent(s.replace(/\+/g, ' '));
        }
        var match, search = window.location.search;
        while (match = r.exec(search.substring(1)))
            params[d(match[1])] = d(match[2]);
        window.params = params;
    })();
    var roomid = '';
    if (localStorage.getItem(connection.socketMessageEvent)) {
        roomid = localStorage.getItem(connection.socketMessageEvent);
    } else {
        roomid = connection.token();
    }
    document.getElementById('room-id').value = 'test';
    document.getElementById('room-id').onkeyup = function() {
        localStorage.setItem(connection.socketMessageEvent, this.value);
    };
    var hashString = location.hash.replace('#', '');
    if (hashString.length && hashString.indexOf('comment-') == 0) {
        hashString = '';
    }
    var roomid = params.roomid;
    if (!roomid && hashString.length) {
        roomid = hashString;
    }
    if (roomid && roomid.length) {
        document.getElementById('room-id').value = roomid;
        localStorage.setItem(connection.socketMessageEvent, roomid);
        // auto-join-room
        (function reCheckRoomPresence() {
            connection.checkPresence(roomid, function(isRoomExists) {
                if (isRoomExists) {
                    connection.join(roomid);
                    return;
                }
                setTimeout(reCheckRoomPresence, 5000);
            });
        })();
        disableInputButtons();
    }

    // ......................................................
    // .......................UI Code........................
    // ......................................................
    document.getElementById('open-room').onclick = function() {
        var yourName = getElement('#your-name');
        var username = yourName.value || 'Anonymous';

        connection.extra = {
            username: username
        };
        disableInputButtons();
        showSnackBar("Creating room: " + document.getElementById('room-id').value, 5000);
        connection.open(document.getElementById('room-id').value, function() {
            showRoomURL(connection.sessionid);
        });
        startCounter();
    };
    document.getElementById('join-room').onclick = function() {
        var yourName = getElement('#your-name');
        var username = yourName.value || 'Anonymous';

        connection.extra = {
            username: username
        };
        disableInputButtons();
        showSnackBar(connection.extra.username + " joining room: " + document.getElementById('room-id').value, 5000);
        connection.join(document.getElementById('room-id').value);
        startCounter();
    };
    document.getElementById('open-or-join-room').onclick = function() {
        var yourName = getElement('#your-name');
        var username = yourName.value || 'Anonymous';

        connection.extra = {
            username: username
        };
        disableInputButtons();
        connection.openOrJoin(document.getElementById('room-id').value, function(isRoomExists, roomid) {
            if (!isRoomExists) {
                showRoomURL(roomid);
            }
        });
        startCounter();
    };
    document.getElementById('btn-leave-room').onclick = function() {
        this.disabled = true;
        if (connection.isInitiator) {
            // use this method if you did NOT set "autoCloseEntireSession===true"
            // for more info: https://github.com/muaz-khan/RTCMultiConnection#closeentiresession
            connection.closeEntireSession(function() {
                showSnackBar("Entire session has been closed.", 10000);
                /* document.querySelector('h1').innerHTML = 'Entire session has been closed.'; */
            });
        } else {
            connection.leave();
        }
    };

    /*
     ********************************************************************************************************************************
     ********************************************************************************************************************************
     ********************************************************************************************************************************
     ********************************************************************************************************************************
     ********************************************************************************************************************************
     */

    connection.onerror = function() {
        showSnackBar("Unable to connect to the chat server! Kindly refresh", 20000);
    };

    /*
     ********************************************************************************************************************************
     ********************************************************************************************************************************
     ********************************************************************************************************************************
     ********************************************************************************************************************************
     ********************************************************************************************************************************
     */

    connection.onmessage = function(e) {
        var data = JSON.parse(e.data);

        switch (data.action) {
            case 'modified':
                var div = document.getElementById(data.msgId);
                if (div) {
                    div.innerHTML = data.msg;
                }
                break;

            case 'removed':
                var div = document.getElementById(data.msgId);
                if (!div) return;
                div.parentNode.removeChild(div);
                break;

            case 'imOnline':
                setRemoteStatus('online');
                break;

            case 'imOffline':
                setRemoteStatus('offline');

                showSnackBar(e.extra.username + " left room", 10000);
                break;

            case 'txt':
                //it is a text chat
                addRemoteChat(data.msg, data.date);

                //play msg tone
                document.getElementById('msgTone').play();

                break;

            case 'newSub':
                setRemoteStatus('online');

                //once the other user joined and current user has been notified, current user should also send a signal
                //that he is online
                connection.send(JSON.stringify({
                    action: 'imOnline',
                    room: roomid
                }));

                showSnackBar(e.extra.username + " entered room", 10000);

                break;

            case 'typingStatus':
                if (data.status) {
                    document.getElementById("typingInfo").innerHTML = e.extra.username + " is typing";
                } else {
                    document.getElementById("typingInfo").innerHTML = "";
                }

                break;
        }
    };

    /*
     ********************************************************************************************************************************
     ********************************************************************************************************************************
     ********************************************************************************************************************************
     ********************************************************************************************************************************
     ********************************************************************************************************************************
     */

    // File Sharing Code
    document.getElementById('share-file').onclick = function() {
        var fileSelector = new FileSelector();
        fileSelector.selectSingleFile(function(file) {
            connection.send(file);
        });
    };

    /*
     ********************************************************************************************************************************
     ********************************************************************************************************************************
     ********************************************************************************************************************************
     ********************************************************************************************************************************
     ********************************************************************************************************************************
     */
    // TO SEND MESSAGE TO REMOTE and Show typing status..
    document.getElementById('input-text-chat').onkeyup = function(e) {
        numberOfKeys++;

        msgId = randomString(5);

        if (numberOfKeys > 3) {
            numberOfKeys = 0;
        }

        if (!numberOfKeys) {
            if (!msgId) {
                /* msgId = Math.round(Math.random() * 999999999) + 9995000; */
                msgId = randomString(5);
            }

            connection.send(JSON.stringify({
                action: 'typingStatus',
                status: true,
                room: roomid
            }));
        }

        if (document.getElementById('input-text-chat').value == '') {
            connection.send(JSON.stringify({
                action: 'typingStatus',
                status: false,
                room: roomid
            }));
            return;
        }

        if (e.keyCode != 13) return;
        // removing trailing/leading whitespace
        var msg = document.getElementById('input-text-chat').value.trim();
        // this.value = this.value.replace(/^\s+|\s+$/g, '');
        if (!msg.length) return;
        if (msg) {
            var date = new Date().toLocaleTimeString();

            addLocalChat(msg, date, msgId, true);
            connection.send(JSON.stringify({
                action: 'txt',
                msg: msg,
                room: roomid
            }));

            // Play tone
            document.getElementById('msgTone').play();

            //clear text
            document.getElementById("input-text-chat").value = "";

            return false;
        }
    };

    /*
     ********************************************************************************************************************************
     ********************************************************************************************************************************
     ********************************************************************************************************************************
     ********************************************************************************************************************************
     ********************************************************************************************************************************
     */
    //TO MAXIMISE/MINIMISE THE CHAT PANE
    $('.chat-pane').on('click', '.icon_minim', function(e) {
        var $this = $(this);

        if (!$this.hasClass('panel-collapsed')) {
            $this.parents('.panel').find('.panel-body').slideUp();
            $this.addClass('panel-collapsed');
            $this.removeClass('fa-minus').addClass('fa-plus');
        } else {
            $this.parents('.panel').find('.panel-body').slideDown();
            $this.removeClass('panel-collapsed');
            $this.removeClass('fa-plus').addClass('fa-minus');
        }

        //fix scrollbar to bottom
        fixChatScrollBarToBottom();
    });

    /*
     ********************************************************************************************************************************
     ********************************************************************************************************************************
     ********************************************************************************************************************************
     ********************************************************************************************************************************
     ********************************************************************************************************************************
     */

    //Maximise the chat pane when user focuses on the input and pane is collapsed
    $('.chat-pane').on('focus', '.chat_input', function() {
        var $this = $(this);

        if ($('#minim_chat_window').hasClass('panel-collapsed')) {
            $this.parents('.panel').find('.panel-body').slideDown();
            $('#minim_chat_window').removeClass('panel-collapsed');
            $('#minim_chat_window').removeClass('fa-plus').addClass('fa-minus');

            //fix scrollbar to bottom
            fixChatScrollBarToBottom();
        }
    });
});

/*
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 */

function modify(msgId, modifiedValue) {
    connection.send({
        action: 'modified',
        msg: modifiedValue,
        msgId: msgId
    });
}

/*
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 */

function remove(msgId) {
    connection.send({
        action: 'removed',
        msgId: msgId
    });
}

/*
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 */

function showSnackBar(msg, displayTime) {
    document.getElementById('snackbar').innerHTML = msg;
    document.getElementById('snackbar').className = document.getElementById('snackbar').getAttribute('class') + " show";

    setTimeout(function() {
        $("#snackbar").html("").removeClass("show");
    }, displayTime);
}

/*
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 */

//set the status of remote (online or offline)
function setRemoteStatus(status) {
    if (status === 'online') {
        $("#remoteStatus").css('color', 'green');
        $("#remoteStatusTxt").css({
            color: 'green'
        }).html("(Online)");
    } else {
        $("#remoteStatus").css('color', '');
        $("#remoteStatusTxt").css({
            color: 'red'
        }).html("(Offline)");
    }
}

/*
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 */

function sendChatToSocket(msg, date, msgId) {
    connection.send(JSON.stringify({
        action: 'txt',
        msg: msg,
        date: date,
        room: document.getElementById('room-id').value
    }));

    //change the sent status to indicate it has been sent
    //$(".sentStatus").last().removeClass('fa-clock-o').addClass('fa-check text-success');
    $("#" + msgId).removeClass('fa-clock-o').addClass('fa-check text-success');
}

/*
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 */

/**
 * 
 * @param {type} msg
 * @param {type} date
 * @returns {undefined}
 */
function addRemoteChat(msg, date) {
    new Promise(function(resolve, reject) {
        var newNode = document.createElement('div');

        newNode.className = "row msg_container base_receive";

        return resolve(newNode);
    }).then(function(newlyCreatedNode) {
        newlyCreatedNode.innerHTML = '<div class="col-sm-10 col-xs-10">\
                <div class="messages msg_receive">\
                    <p>' + msg + '</p>\
                    <time>' + connection.extra.username + ' • ' + date + '</time>\
                </div>\
            </div>';

        document.getElementById('chats').appendChild(newlyCreatedNode);

        //open the chat just in case it is closed
        document.getElementById("input-text-chat").focus();

        fixChatScrollBarToBottom();
    });
}

/*
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 */

/**
 * 
 * @param {type} msg
 * @param {type} date
 * @param {type} sendToPartner
 * @returns {undefined}
 */
function addLocalChat(msg, date, msgId, sendToPartner) {
    //if msg is to be sent to partner, (meaning the msg was typed on the current browser), leave the sent status to 'busy' until
    //it is actually sent.

    //var msgId = randomString(5); //this will be used to change the sent status once it is sent (applicable if we're saving to db)

    new Promise(function(resolve, reject) {
        var newNode = document.createElement('div');

        newNode.className = "row msg_container base_sent";

        return resolve(newNode);
    }).then(function(newlyCreatedNode) {
        newlyCreatedNode.innerHTML = '<div class="col-sm-10 col-xs-10">\
                <div class="messages msg_sent">\
                    <p>' + msg + '</p>\
                    <time>You • ' + date + ' <i class="fa fa-clock-o sentStatus" id="' + msgId + '"></i></time>\
                </div>\
            </div>';

        document.getElementById('chats').appendChild(newlyCreatedNode);

        if (sendToPartner) {
            //use this if you just want to send via socket without saving in db
            sendChatToSocket(msg, date, msgId);
        }
    });

    fixChatScrollBarToBottom();
}

/*
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 */
// Adding users to dropdown menu
function userlog() {
    new Promise(function(resolve, reject) {
        var newDiv = document.createElement('li');
        return resolve(newDiv);
    }).then(function(newlyDiv) {
        var list = connection.getAllParticipants();
        var i;
        if (connection.getAllParticipants().length) {
            for (i = 0; i < list.length; i++) {
                newlyDiv.innerHTML = '<a>' + list[i] + '</a>';
            }
        } else {
            newlyDiv.innerHTML = '<a>' + connection.extra.username + '</a>';
        }

        document.getElementById('dropdown-menu').appendChild(newlyDiv);
    });
}

/*
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 */

function fixChatScrollBarToBottom() {
    var msgPane = document.getElementById("chats");
    msgPane.scrollTop = msgPane.scrollHeight;
}

/*
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 */

function startCounter() {
    var sec = "00";
    var min = "00";
    var hr = "00";

    var hrElem = document.querySelector("#countHr");
    var minElem = document.querySelector("#countMin");
    var secElem = document.querySelector("#countSec");

    hrElem.innerHTML = hr;
    minElem.innerHTML = min;
    secElem.innerHTML = sec;

    setInterval(function() {
        //display seconds and increment it by a sec
        ++sec;

        secElem.innerHTML = sec >= 60 ? "00" : (sec < 10 ? "0" + sec : sec);

        if (sec >= 60) {
            //increase minute and reset secs to 00
            ++min;
            minElem.innerHTML = min < 10 ? "0" + min : min;

            sec = 0;

            if (min >= 60) {
                //increase hr by one and reset min to 00
                ++hr;
                hrElem.innerHTML = hr < 10 ? "0" + hr : hr;

                min = 0;
            }
        }

    }, 1000);
}

/*
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 ********************************************************************************************************************************
 */

/**
 * 
 * @param {type} length
 * @returns {String}
 */
function randomString(length) {
    var rand = Math.random().toString(36).slice(2).substring(0, length);

    return rand;
}