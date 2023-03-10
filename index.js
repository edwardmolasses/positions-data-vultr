const express = require('express');
const dotenv = require('dotenv').config();
const CSVToJSON = require('csvtojson');
const schedule = require('node-schedule');
const PORT = process.env.PORT || 5005
const addPositions = require('./addPositions');
const getVixData = require('./getVixData');
const getPositionsData = require('./getPositionsData');
const { sendTelegramAlertMessage, sendTelegramDailyMessage } = require('./sendTelegramMessages');
const setVariableInterval = require('./setVariableInterval');
const getContentfulNumOfEntries = require('./getContentfulNumOfEntries');
const { DEBUG_MODE } = require('./constants');

const app = express(); //Line 2
const path = __dirname + '/public/views/';

// get leverage positions interval
setVariableInterval(() => { addPositions() }, 55);

if (DEBUG_MODE.TELEGRAM_TOGGLE) {
  // alert message interval
  setTimeout(() => {
    setVariableInterval(() => { sendTelegramAlertMessage() }, 15, false);
  }, 5 * 60 * 1000);

  // daily digest scheduled job
  setVariableInterval(() => { sendTelegramDailyMessage() }, 45, false);
  // const dailyDigestRule = new schedule.RecurrenceRule();
  // dailyDigestRule.hour = 6;
  // dailyDigestRule.minute = 0;
  // const dailyDigestJob = schedule.scheduleJob(dailyDigestRule, function () {
  //   sendTelegramDailyMessage();
  // });
}

app.use(express.static(path));

app.get('/', function (req, res) {
  res.sendFile(path + "index");
});

// create a GET route
app.get('/api/getContentfulNumOfEntries', async (req, res) => {
  const numOfEntries = await getContentfulNumOfEntries();
  res.send({ "numOfEntries": numOfEntries });
});

app.get('/api/positionsDataFromContentful', async (req, res) => {
  console.log('handing positionsData from contentful request...');
  res.send(await getPositionsData());
});

app.get('/api/positionsData', async (req, res) => {
  console.log('handing positionsData request...');
  CSVToJSON().fromFile('positions.csv')
    .then(positions => {
      res.send(
        positions.map(row => {
          return {
            "timestamp": parseInt(row['timestamp']),
            "shortLongDiff": parseInt(row['shortLongDiff']),
            "shortVolume": parseInt(row['shortVolume']),
            "longVolume": parseInt(row['longVolume']),
            "ethPrice": !!row['ethPrice'] ? parseInt(row['ethPrice']) : null
          }
        })
      );
    }).catch(err => {
      // log error if any
      console.log(err);
    });
})

app.listen(PORT, () => console.log(`Listening on ${PORT}`));
