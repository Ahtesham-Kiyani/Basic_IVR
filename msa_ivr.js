const defaultConfig = require("./config.json");
var client = require("ari-client");
const uuidv4 = require("uuid").v4;
const moment = require("moment");
var ip = require("ip");
const al = require("./al");

let prompts = {
  msa: ["msa_menu", "msa_info"],
  wrongInput: "wrongdtmf",
};
const userMap = new Map();

// Connection to asterisk
client.connect(
  defaultConfig.asteriskHost,
  defaultConfig.asteriskUserName,
  defaultConfig.asteriskPass,
  clientLoaded
);
function clientLoaded(err, ari) {
  if (err) {
    throw err;
  }

  ari.on("StasisStart", (event, channel) =>
    channelStasisStart({
      event,
      channel,
      ari,
    })
  );
  ari.on("ChannelDtmfReceived", (event, channel) =>
    channelDtmfRecieved({
      event,
      channel,
      ari,
    })
  );
  ari.on("StasisEnd", (event, channel) =>
    channelDestroyed({
      event,
      channel,
      ari,
    })
  );
  ari.removeListener("StasisStart", channelStasisStart);
  ari.removeListener("ChannelDtmfReceived", channelDtmfRecieved);
  ari.removeListener("StasisEnd", channelDestroyed);
  ari.start("msa_ivr");
}

async function channelStasisStart(payload) {
  const uuid = uuidv4();
  const { event, channel, ari } = payload;
  channel.answer().catch((err) => {});
  var incomingNumber = event.channel.caller.number;
  let EventArgs = event.args[0];

  userMap.set(incomingNumber, {
    a_party_num: "",
    b_party_num: "",
    processed_dt: moment(Date.now()).format("DD-MM-YYYY hh:mm:ssA"),
    uuid: "",
    SIP_Incoming_CallID: "",
    incoming_channel: "",
    incoming_channelID: "",
    dtmfEntered: "",
    dtmfEnteredNumber: "",
    callStartTime: "",
    callEndTime: "",
    playback: null,
    subscriber: 0,
    audioDuration: 0,
    timeout: null,
    option_status_dtmf: false,
    ivr_state: 0,
    serviceInfo: false,
    wrong_dtmf_count: 0,
    wrong_bparty_count: 0,
  });

  console.log(
    "[" +
      moment(Date.now()).format("DD-MM-YYYY hh:mm:ssA") +
      "] [" +
      userMap.get(incomingNumber).uuid +
      "] After Allocation of " +
      incomingNumber +
      " Map Size is : " +
      userMap.size
  );
  userMap.get(incomingNumber).uuid = uuid;
  const currentTime = moment().format("YYYY-MM-DD h:mm:ss");
  userMap.get(incomingNumber).a_party_num = al.formatCellNumber(incomingNumber);
  userMap.get(incomingNumber).service_name = EventArgs;
  console.log(
    "[" +
      moment(Date.now()).format("DD-MM-YYYY hh:mm:ssA") +
      "] [" +
      userMap.get(incomingNumber).uuid +
      "] call landed on service : " +
      EventArgs +
      " from Number :  " +
      incomingNumber
  );
  userMap.get(incomingNumber).uuid = uuid;
  userMap.get(incomingNumber).incoming_channel = channel;
  userMap.get(incomingNumber).Media_IP_Addr = ip.address();
  userMap.get(incomingNumber).callStartTime = moment(Date.now()).format();
  userMap.get(incomingNumber).incoming_channelID = channel.id;
  console.log(
    "[" +
      moment(Date.now()).format("DD-MM-YYYY hh:mm:ssA") +
      "] [" +
      userMap.get(incomingNumber).uuid +
      "] Media IP address:" +
      userMap.get(incomingNumber).Media_IP_Addr
  );
  play(
    channel,
    defaultConfig.soundsDirectory + prompts["msa"][0],
    ari,
    incomingNumber
  );
}

async function channelDtmfRecieved(payload) {
  let { event, channel, ari } = payload;
  var incomingNumber = event.channel.caller.number;
  var digit = event.digit;
  let uuid;
  if (userMap.get(incomingNumber)) {
    userMap.get(incomingNumber).dtmfEntered = digit;
    userMap.get(incomingNumber).dtmfEnteredNumber += digit;
    uuid = userMap.get(incomingNumber).uuid;
  }

  console.log(
    "[" +
      moment(Date.now()).format("DD-MM-YYYY hh:mm:ssA") +
      "] [" +
      uuid +
      "] " +
      incomingNumber +
      " Dtmf entered: " +
      userMap.get(incomingNumber).dtmfEntered
  );
  clearTimeout(userMap.get(incomingNumber).timeout); // Clear previous SetTimeouts
  stopPrevPlayback(incomingNumber);

  if (userMap.get(incomingNumber).dtmfEntered == "1") {
    play(
      channel,
      defaultConfig.soundsDirectory + prompts["msa"][1],
      ari,
      incomingNumber
    ); // msa info
    // sleepAndHangup(channel,30000, incomingNumber);
  } else {
    play(
      channel,
      defaultConfig.soundsDirectory + prompts["wrongInput"],
      ari,
      incomingNumber
    );
    // sleepAndHangup(channel,10000, incomingNumber);
  }
}

// Function channleDestroyed
function channelDestroyed(payload) {
  let { event, channel, ari } = payload;
  var incomingNumber = event.channel.caller.number;
  var callEndTime = moment().format(`YYYY-MM-DD HH:mm:ss`);
  userMap.callEndTime = callEndTime;
  if (userMap.has(incomingNumber)) {
    // channel.hangup(function (err) {
    //   userMap.get(incomingNumber).callEndTime = moment(Date.now()).format();
    //   console.log(`[${moment(Date.now()).format("DD-MM-YYYY hh:mm:ssA")}] User :` + userMap.get(incomingNumber).a_party_num + " Hanged Up ");
    //   console.log("[" + moment(Date.now()).format("DD-MM-YYYY hh:mm:ssA") + "] [" + userMap.get(incomingNumber).uuid + "] Call End time : " + userMap.get(incomingNumber).callEndTime);
    // });
    if (userMap.get(incomingNumber).timeout) {
      clearTimeout(userMap.get(incomingNumber).timeout);
    }
    userMap.get(incomingNumber).wrong_dtmf_count = 0;
    userMap.delete(incomingNumber);
    console.log(
      "[" +
        moment(Date.now()).format("DD-MM-YYYY hh:mm:ssA") +
        "] After deletion of map for: " +
        incomingNumber +
        " map size is: " +
        userMap.size
    );
  }
}

async function play(channel, sound, ari, incomingNumber, callback) {
  var playback = ari.Playback();
  userMap.get(incomingNumber).playback = playback;
  console.log(
    "[" +
      moment(Date.now()).format("DD-MM-YYYY hh:mm:ssA") +
      "] [" +
      userMap.get(incomingNumber).uuid +
      "] " +
      sound +
      " Played for = " +
      incomingNumber
  );
  playback.once("PlaybackFinished", function (event, instance) {
    // channel.hangup().catch(err => {})
  });
  channel.play({ media: sound }, playback, function (err, playback) {
    if (err) throw err;
  });
}

// Fucntion to stop previous playback
function stopPrevPlayback(incomingNumber) {
  const playback = userMap.get(incomingNumber).playback;
  playback.stop().catch((err) => {});
}

const sleepAndHangup = (channel, timeInMs, incomingNumber) => {
  let uuid;
  if (userMap.get(incomingNumber).uuid) {
    uuid = userMap.get(incomingNumber).uuid;
  }
  let timeoutId = setTimeout(() => {
    console.log(
      `[ ${moment(Date.now()).format(
        "DD-MM-YYYY hh:mm:ssA"
      )} ] [${uuid}] Channel with Id [${
        channel.id
      }] user ${incomingNumber} hangup`
    );
    channel.hangup().catch((err) => {});
  }, timeInMs);
  userMap.get(incomingNumber).timeout = timeoutId;
};

const playPrompt = async (channel, sound, ari, incomingNumber, waitTime) => {
  console.log(`Play prompt function called for ${sound}`);
  var playback = ari.Playback();
  userMap.get(incomingNumber).playback = playback;
  await channel.play({ media: sound }, playback).catch(async (err) => {
    console.log(
      "[" +
        moment(Date.now()).format("DD-MM-YYYY hh:mm:ssA") +
        "] [" +
        userMap.get(incomingNumber).uuid +
        "]" +
        " Error in playing promp!!"
    );
    await channel.hangup().catch((err) => {});
  });
  playback.once(`PlaybackFinished`, async (event, playbackFinished) => {
    console.log(
      "[" +
        moment(Date.now()).format("DD-MM-YYYY hh:mm:ssA") +
        "] [" +
        userMap.get(incomingNumber).uuid +
        "]" +
        " playback finished!!"
    );
    // await sleep(waitTime);
    if (channel && playbackFinished.state !== "failed") {
      console.log(
        "[" +
          moment(Date.now()).format("DD-MM-YYYY hh:mm:ssA") +
          "] [" +
          userMap.get(incomingNumber).uuid +
          "]" +
          " Hanging up after playing " +
          sound
      );
      await channel.hangup().catch((err) => {});
    }
  });
};
