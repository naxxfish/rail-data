const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const JSONStream = require('JSONStream')
const es = require('event-stream')
const logger = require('../log.js')

const appDir = path.dirname(require.main.filename)
var berthData = null

function initialise () {
  return new Promise((resolve, reject) => {
    const SMARTDataFilePath = path.join(appDir, '/reference/SMARTExtract.json.gz')
    fs.stat(SMARTDataFilePath, (err, stats) => {
      if (err) {
        console.log('Please visit http://datafeeds.networkrail.co.uk/ntrod/SupportingFileAuthenticate?type=SMART and download the SMARTExtract.json.gz to the reference folder')
        reject(new Error('Could not load SMART data'))
      }
      console.log('importing time!')
      const gunzip = zlib.createGunzip()
      const SMARTDataFileStream = fs.createReadStream(SMARTDataFilePath).pipe(gunzip)
      SMARTDataFileStream
        .pipe(JSONStream.parse('BERTHDATA'))
        .pipe(es.mapSync((data) => {
          // maybe sort this in some kind of order?
          berthData = data
          resolve()
        }))
    })
  })
}

function parseStepEvent(stepEvent) {
  var eventType = null
  var eventDirection = null
  switch (stepEvent.EVENT) {
    case 'A':
      eventType = 'arrival'
      eventDirection = 'up'
      break
    case 'B':
      eventType = 'depart'
      eventDirection = 'up'
      break
    case 'C':
      eventType = 'arrive'
      eventDirection = 'down'
      break
    case 'D':
      eventType = 'depart'
      eventDirection = 'down'
      break
    default:
      eventType = 'unknown'
      eventDirection = 'unknown'
  }
  var stepType = null
  switch (stepEvent.STEPTYPE) {
    case 'B':
      stepType = 'between'
      break
    case 'F':
      stepType = 'from'
      break
    case 'T':
      stepType = 'to'
      break
    case 'D':
      stepType = 'immediate_first'
      break
    case 'C':
      stepType = 'clearout'
      break
    case 'I':
      stepType = 'interpose'
      break
    case 'E':
      stepType = 'immediate'
      break
    default:
      stepType = 'unknown'
  }
  return {
    berths: {
      from: stepEvent.FROMBERTH,
      to: stepEvent.TOBERTH
    },
    lines: {
      from: stepEvent.FROMLINE,
      to: stepEvent.TOLINE
    },
    event: {
      type: eventType,
      direction: eventDirection
    },
    stepType: stepType,
    locations: {
      stanox: stepEvent.STANOX,
      staname: stepEvent.STANME
    }
  }
}

function getBerthStep (areaId, fromBerth, toBerth) {
  return new Promise((resolve, reject) => {
    var resolved = false
    berthData.forEach((stepEvent) => {
      if (stepEvent.FROMBERTH === fromBerth &&
        stepEvent.TOBERTH === toBerth &&
        stepEvent.TD === areaId) {
        resolve(parseStepEvent(stepEvent))
        resolved = true
      }
    })
    // if we cannot find the step event, then it is missing - but there is no error 
    if (!resolved) {
      resolve(null)
    }
  })
}
initialise()
module.exports = {
  initialise,
  getBerthStep
}
