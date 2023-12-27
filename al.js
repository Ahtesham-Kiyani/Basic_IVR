const axios = require('axios');
const moment = require('moment');

class al{
    async checkSubscription(url,incomingNumber){
      console.log(`[${moment(Date.now()).format("DD-MM-YYYY hh:mm:ssA")}}] [${url}] checkSubscription Api callded`);
        let result = await axios.get(`${url}/${incomingNumber}`).catch((err) => {return err})
        console.log('Result:', result)
        if(result){
          if(result.data){
              if(result.data.status == 1){
                return 'subscriber';
              } else if(result.data.status == 6){
                return 'nonsubscriber';
              }
          }
        } else {
          return result;
          // console.log(`[${moment(Date.now()).format("DD-MM-YYYY hh:mm:ssA")}] API Not responding [${url}]`); 
        }
      }

      subscribe(url, body) {
          axios.post(`${url}`, body).then(res => {
          if(res.status == 200){
            console.log(`[${moment(Date.now()).format("DD-MM-YYYY hh:mm:ssA")}}] [${url}] Subscribe Api callded`);
            return res.status;
          } else {
            console.log(`[${moment(Date.now()).format("DD-MM-YYYY hh:mm:ssA")}] Error in api [${url}] with status code ${res.status}`)
          }
        }).catch(err => { console.log(`[${moment(Date.now()).format("DD-MM-YYYY hh:mm:ssA")}] error in api [${url}] => `, err.message) });
      }

      setStatusText(url, incomingNumber, body){
        axios.post(`${url}/${incomingNumber}`, body).then(res => {
          console.log(res.status + ` [${body['my_status_text']}] has been set on your number ${incomingNumber}`)
        }).catch(err => {
          console.log(`[${moment(Date.now()).format("DD-MM-YYYY hh:mm:ssA")}] Error in StatusSetText Api [${url}] `+err)
        })
      }

      // check vip Subscription status
      async checkSubscriberStatus(payload) {
        const { fromNumber, toNumber, uuid, fromSipCallId, channelId, ip } = payload;
        log('Inside checkSubscriberStatus Function Value is'+ { fromNumber, toNumber, uuid, fromSipCallId, channelId, ip });
        const data = await db
            .select(
                "defaultpin",
                "msisdn_secratry",
                "dnd_mode",
                "secratry_mode",
                "secratry_rights",
                "service_id",
                "hlractivation_date",
                "service_mode"
            ).from("subscribers")
            .where({ b_party: toNumber, status: 1 }).first();
            log(`data Returned BY DB ${data}`)
        return data;
    }

      // Format cell no
      formatCellNumber(msisdn) {
        if(msisdn.startsWith("92")){
          msisdn = msisdn.substring(3);
        } else if (msisdn.startsWith("+92")) {
            msisdn = msisdn.substring(3);
        } else if (msisdn.startsWith("0092")) {
            msisdn = msisdn.substring(4);
        } else if (msisdn.startsWith("03")) {
            msisdn = msisdn.substring(1);
        } else if (msisdn.startsWith("3")) {
            msisdn = `${msisdn}`;
        }
        return msisdn;
    }

    async activateVipDnd(url, body) {  
      axios.post(`${url}`, body).then(res => {
        if(res.status == 200){
          console.log(`[${moment(Date.now()).format("DD-MM-YYYY hh:mm:ssA")}}] [${url}] DND Api callded`)
        } else {
          console.log(`[${moment(Date.now()).format("DD-MM-YYYY hh:mm:ssA")}] Error in api [${url}] with status code ${res.status}`)
        }
      }).catch(err => { console.log(`[${moment(Date.now()).format("DD-MM-YYYY hh:mm:ssA")}] error in api [${url}] => `, err.message) });
    }
}

module.exports = new al();