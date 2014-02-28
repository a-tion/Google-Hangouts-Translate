/* settings drop-up menu */

function display_menu_with_icon(p) {
  p.src='//xycs130test.appspot.com/static/settingshover.png';
  window.document.getElementById("drop_menu").style.visibility="visible";
}

function display_menu() {
  window.document.getElementById("drop_menu").style.visibility="visible";
}

function hide_menu() {
  window.document.getElementById("drop_menu").style.visibility="hidden";
}

/* translate */

var arbitraryResource = null;
var arbitraryOverlay = null;

//para:
//message:the content which needs to be traslated(string)
//fromL:the language translate from(string for language code in translate API)
//toL:the language traslate to(string for language code in translate API)
//translate from the same lang to the same one will be a bad request
function translated(message,fromL,toL) {
	var request = "https://www.googleapis.com/language/translate/v2?key=AIzaSyBga9xCOSR4UgO7RElncJJJzNFWS3XvLjs&source="+fromL+"&target="+toL+"&q=" + message;
	var xml = httpGet(request);
	xml = JSON.parse(xml);
	return xml.data.translations[0].translatedText;
}


//helper function for translation
function rawurlencode (str) {
	str = (str + '').toString();
	return encodeURIComponent(str).replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28').
  replace(/\)/g, '%29').replace(/\*/g, '%2A');
}

function httpGet(theUrl) {
  var xmlHttp = null;
  xmlHttp = new XMLHttpRequest();
  xmlHttp.open("GET", theUrl, false);
  xmlHttp.send(null);
  return xmlHttp.responseText;
}

/* hangouts */

function showDefaultFeed() {
  currentHighlightedParticipantId = null;
  var feed = gapi.hangout.layout.getDefaultVideoFeed();
  var canvas = gapi.hangout.layout.getVideoCanvas();
  canvas.setVideoFeed(feed);
  canvas.setWidth(window.innerWidth*0.69);
  canvas.setPosition(0, 0);
  canvas.setVisible(true);
}

function createTextOverlay(string) {
  // Create a canvas to draw on
  var canvas = document.createElement('canvas');
  canvas.setAttribute('width', gapi.hangout.av.effects.ScaleReference.WIDTH);
  canvas.setAttribute('height', 60);
  
  var context = canvas.getContext('2d');

  // Draw text
  context.font = '15px Arial';
  //context.lineWidth = 6;
  //context.lineStyle = '#000';
  context.fillStyle = 'rgba(255,255,255,1.0)';
  context.fillColor = '#ffff00';
  context.textAlign = 'center';
  context.textBaseline = 'bottom';
  context.strokeText(string, canvas.width/2, canvas.height/2);
  context.fillText(string, canvas.width/2, canvas.height/2);

  return canvas.toDataURL();
}

function createSubtitle(subtitle) {
  if(arbitraryResource) {
      arbitraryResource.dispose();
      arbitraryResource = null;
  }
  arbitraryResource = gapi.hangout.av.effects.createImageResource(
      createTextOverlay(subtitle));
  arbitraryOverlay = arbitraryResource.createOverlay(
      {'scale':
       {'magnitude': 1.0,
        'reference': gapi.hangout.av.effects.ScaleReference.WIDTH}});
  arbitraryOverlay.setPosition(0, 0.5);
  arbitraryOverlay.setVisible(true);
}

var localId;    //local user's ID (string)
var localLang="en";  //local user's language code setting (string)
var messageId=0;    //an ID for every meesage sent out (int)
var localMessageList=new Array(); //a list of downloaded message (element is an object in function fullMessage() below)
var localMessageListN=0; //the length of the downloaded message list
var localMessageList_ts=new Array();
var localLangTo="en";
var latest_speech="";
var latest_speech_ts=0;

function fullMessage(userId,messageId,lang,message,fromSpeech) {
  this.userId=userId; //local user's ID (string)
  this.messageId=messageId; //message's ID (int)
  this.lang=lang; //the message's original language code (string)
  this.message=message; //message content (string)
  this.fromSpeech=fromSpeech; //bool
}


//the funcion to be called when the change language button is clicked
//change localLang's value, and show result in "outputLang" in the html
function changeL() {
  var lang = document.getElementById("langArea").value;
  localLang=lang;
}

function changeLTo() {
  var lang = document.getElementById("langAreaTo").value;
  localLangTo=lang;
}

function changeLS() {
  var langS = document.getElementById("langAreaS").value;
  localLangS=langS;
}

//submit a message to the server
//get the value in "inputArea" in the html file as message, and send to the server
function submit() {
  var message = document.getElementById("inputArea").value;
  messageId++; //get new message ID
  localId = gapi.hangout.getLocalParticipantId(); //user ID
  newMessage = new fullMessage(localId,messageId,localLang,message,false); //make a new message object with full information
  gapi.hangout.data.setValue(localId+messageId,JSON.stringify(newMessage));
  //change the shared state in the server
  //with key=localID+messageID as a unique ID for each message
  //       value=JSON.stringify(newMessage)  serialized full message
  document.getElementById("inputArea").value = "";
}

function submitSP() {
  var message = document.getElementById("inputArea").value;
  messageId++; //get new message ID
  localId = gapi.hangout.getLocalParticipantId(); //user ID
  newMessage = new fullMessage(localId,messageId,localLang,message,true); //make a new message object with full information
  gapi.hangout.data.setValue(localId+messageId,JSON.stringify(newMessage));
  //change the shared state in the server
  //with key=localID+messageID as a unique ID for each message
  //       value=JSON.stringify(newMessage)  serialized full message
  document.getElementById("inputArea").value = "";
}

//compare two messageWithTime object based on timestamp used for sorting
function compare(a,b) {
  if (a.timestamp < b.timestamp)
     return -1;
  if (a.timestamp > b.timestamp)
    return 1;
  return 0;
}


//the callback funtion used when the state changed (got new messages)
var onStateChange = function(eventObj) {
  newMessageWithTime=new Array();
  var n=0;
    for (var i = 0; i < eventObj.addedKeys.length; ++i) {
      newMessageWithTime[n]=eventObj.addedKeys[i];
      console.log(n);
      console.log(newMessageWithTime[n].key);
      console.log(newMessageWithTime[n].value);
      console.log(newMessageWithTime[n].timestamp);
      n++;
    }
  //get all the new messages
  newMessageWithTime.sort(compare); //sort the new messages based on timestamp
  console.log("finished sort");


  for (var i=0; i<newMessageWithTime.length; ++i) {
    localMessageList[localMessageListN]=JSON.parse(newMessageWithTime[i].value);
    localMessageList_ts[localMessageListN]=newMessageWithTime[i].timestamp;
    console.log(localMessageList[localMessageListN]);
    localMessageListN++;
  }
  //update the local message list
 //change the output for message log
  var output="";
  var latest_speech_i=-1;
  for (var i=localMessageListN-10; i<localMessageListN; i++) {
    if (i<0) continue;
    userName=gapi.hangout.getParticipantById(localMessageList[i].userId).person.displayName;
    console.log("baosui");
    console.log(userName+" Speaks in "+localMessageList[i].lang+ " : "+localMessageList[i].message + "<br>");
    output=output+userName+" Speaks in "+localMessageList[i].lang+ " : "+localMessageList[i].message + "<br>";
    console.log("Translate from " + localMessageList[i].lang + " to " +localLang+": "+localMessageList[i].message+"<br>");
    if (localMessageList[i].lang!=localLang) output=output+"Translate from " + localMessageList[i].lang + " to " +localLang+": "+translated(localMessageList[i].message,localMessageList[i].lang,localLang)+"<br>";
    else {
      if(localMessageList[i].lang!=localLangTo) output=output+"Translate from " + localMessageList[i].lang + " to " +localLangTo+": "+translated(localMessageList[i].message,localMessageList[i].lang,localLangTo)+"<br>";
      else output=output+"Translate from " + localMessageList[i].lang + " to " +localLangTo+": "+localMessageList[i].message+"<br>";
    }
    console.log("current version 1");
    if (localMessageList[i].fromSpeech==true  && localMessageList_ts[i]>latest_speech_ts && localMessageList[i].userId == gapi.hangout.getLocalParticipantId()) {
      console.log("update latest speech "+localMessageList[i].message);
      console.log(localMessageList[i].userId);
      console.log(gapi.hangout.getLocalParticipantId());
      latest_speech_ts=localMessageList_ts[i];
      latest_speech=localMessageList[i].message;
      latest_speech_i=i;
    }
  }

  if (latest_speech!="" && latest_speech_i!=-1) {
    var subtitle;
    var i=latest_speech_i;
    if (localMessageList[i].lang!=localLang) subtitle=translated(localMessageList[i].message,localMessageList[i].lang,localLang);
    else {
      if(localMessageList[i].lang!=localLangTo) subtitle=translated(localMessageList[i].message,localMessageList[i].lang,localLangTo);
      else subtitle=localMessageList[i].message;
    }
    console.log("create subtitle " + subtitle);
    createSubtitle(subtitle);
  }
  if (output!="") document.getElementById("outputArea").innerHTML=output;
}


//initialization
function init() {
  // When API is ready...                                                         
  gapi.hangout.onApiReady.add(
      function(eventObj) {
    	  gapi.hangout.data.onStateChanged.add(onStateChange); //add callback function
        showDefaultFeed();
      });
}

// Wait for gadget to load.                                                       
gadgets.util.registerOnLoadHandler(init);

window.addEventListener('resize', resizeWindow);

function resizeWindow() {
  console.log("Window Width: " + window.innerWidth);
  console.log("Window Height: " + window.innerHeight);

  var feed = gapi.hangout.layout.getDefaultVideoFeed();
  var canvas = gapi.hangout.layout.getVideoCanvas();

  canvas.setVideoFeed(feed);
  canvas.setWidth(window.innerWidth*0.69);
  canvas.setPosition(0, 0);
  canvas.setVisible(true);

  console.log("canvas size changed !")
}