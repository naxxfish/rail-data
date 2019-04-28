const SMARTReferenceImporter = require('./lib/BerthStepReference')
//[VC] Berth Step from 0182 to 0176 by 2K56
// [VC] Berth Step from 0583 to 0591 by 2I06
// [VC] Berth Step from 0480 to 0478 by 1K06
// [VC] Berth Step from 0605 to 0613 by 2I06
SMARTReferenceImporter.initialise()
  .then(() => {
    SMARTReferenceImporter.getBerthStep('VC', '0605', '0613')
    .then((stepEvent) => {
      console.log(stepEvent)
    })
    .catch((err) => {
      console.log('nah! ', err)
    })
  })
