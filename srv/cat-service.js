/*eslint-disable no-console, no-alert */

const consumeDestination = require("consume-destination-scp-cf");

var REPORT_PIE = [];
var REPORT_BARS = [];
var REPORT_ROWS = [];
var REPORT_TABLE = [];
var TIMESTAMP = [];
var UPDATE = [{UPDATEID: 101}];

console.log("INITIALIZING SERVER: UPDATING VALUES");
updatevalues();

//Handlers for OData API

module.exports = (srv) => {

 // Reply mock data for REPORT_PIE...
 srv.on ('READ', 'REPORT_PIE', ()=>REPORT_PIE)
 
 // Reply mock data for REPORT_BARS...
 srv.on ('READ', 'REPORT_BARS', ()=>REPORT_BARS)
 
 // Reply mock data for REPORT_ROWS...
 srv.on ('READ', 'REPORT_ROWS', ()=>REPORT_ROWS)
 
 // Reply mock data for REPORT_TABLE...
 srv.on ('READ', 'REPORT_TABLE', ()=>REPORT_TABLE)
 
 // Reply mock data for TIMESTAMP...
 srv.on ('READ', 'TIMESTAMP', ()=>TIMESTAMP)
 
 // Reply mock data for UPDATE
 srv.on ('READ', 'UPDATE', ()=>UPDATE)
 
 srv.after ('READ', 'UPDATE', async (req) => {
    updatevalues();
  })
 
 
 
 //Update values when UPDATE is requested
 

}

function updatevalues() {
  
	    var optionsJobReqScreeningQuestions = {
		url: "/odata/v2/JobReqScreeningQuestion?$select=jobReqId,jobReqContent,order,questionId,questionName,required,disqualifier,questionType,locale&$format=json",
		destinationInstance: "mydestination",
		destinationName: "sap_hcmcloud_core_odata",
		httpMethod: "GET"
		};
		
		var optionsJobRequisitionLocale = {
		url: "/odata/v2/JobRequisitionLocale?$select=jobReqLocalId,jobReqId,externalTitle&$format=json",
		destinationInstance: "mydestination",
		destinationName: "sap_hcmcloud_core_odata",
		httpMethod: "GET"
		};
		
		console.log("Destination params are ok");
		Promise.all([consumeDestination(optionsJobReqScreeningQuestions),consumeDestination(optionsJobRequisitionLocale)]).then(
		function(sfsfresponses){
		
				console.log("SFSF API's called successfully");
				
				var oDataQuestions = JSON.parse(sfsfresponses[0]).d.results;
				var oDataLocale = JSON.parse(sfsfresponses[1]).d.results;
				
				var reqId=[];
				var nameOfReq = [];
				for(var key in oDataLocale) {
					reqId.push(oDataLocale[key].jobReqId + "l");
					nameOfReq.push(oDataLocale[key].externalTitle);
				}
				
				var countReq={}, countOrder={};
				for(var key2 in oDataQuestions){
					if(oDataQuestions[key2].locale==="en_US"){
					    countReq[oDataQuestions[key2].jobReqId] = 1 + (countReq[oDataQuestions[key2].jobReqId] || 0);
					    countOrder[oDataQuestions[key2].order] = 1 + (countOrder[oDataQuestions[key2].order] || 0);
					}
				}
				
				REPORT_PIE = [
					{ LABEL:'Yes', PERCENTAGE:Math.round((Object.getOwnPropertyNames(countReq).length/reqId.length)*100), ABSOLUTE:Object.getOwnPropertyNames(countReq).length},
					{ LABEL:'No', PERCENTAGE:100-Math.round((Object.getOwnPropertyNames(countReq).length/reqId.length)*100), ABSOLUTE:reqId.length-Object.getOwnPropertyNames(countReq).length}
				];
				
				
				//Table
				//Now we are building the table. We will count the appearances of each question to do the third report. Then we are just translating some labels and making them strings.
				//With the two arrays (reqId and reqName) we get the name of the requisition.
				var quesType, reqName;
				var countQues={};
				var countQuesid={};
				var k=0;
				for(var key3 in oDataQuestions){
					k++;
					countQues[oDataQuestions[key3].questionName] = 1 + (countQues[oDataQuestions[key3].questionName] || 0);
					countQuesid[oDataQuestions[key3].questionName] = oDataQuestions[key3].questionId; 
					switch(oDataQuestions[key3].questionType) {
					      case "QUESTION_MULTI_CHOICE":
					        quesType = "Multi Choice"; break;
					      case "QUESTION_NUMERIC":
					        quesType = "Numeric"; break;
					      case "QUESTION_TEXT":
					        quesType = "Text"; break;
					      case "QUESTION_RATING":
					        quesType = "Rating"; break;
					      default:
					        quesType = "No type";
					}
					REPORT_TABLE.push({
						SQID: parseInt(oDataQuestions[key3].jobReqId+oDataQuestions[key3].questionId+k,10), 
						REQID: parseInt(oDataQuestions[key3].jobReqId,10), 
						QNAME: oDataQuestions[key3].questionName, 
						QTYPE: quesType, 
						REQUIRED: oDataQuestions[key3].required.toString(), 
						DISQUALIFIER: oDataQuestions[key3].disqualifier.toString(), 
						REQNAME: nameOfReq[reqId.indexOf(oDataQuestions[key3].jobReqId+"l")]
					});
				}
				
				//For the report of how many questions are used per requisition and which are the most common questions, a little bit of sorting an calculations need to be done:
				var repRowsNotSorted=[];
				var repBarsNotSorted=[];
				//We create an array with the structure we need
				for(key in countQues){
					if (countQues.hasOwnProperty(key)) {
					    repRowsNotSorted.push({"QUESID": parseInt(countQuesid[key],10), "QUESTIONS": key, "TIMES": parseInt(countQues[key],10)});
					}
				}
				for(key in countOrder){
					if (countOrder.hasOwnProperty(key)) {
					    repBarsNotSorted.push({"QUESTIONS": parseInt(key,10), "REQUISITIONS": parseInt(countOrder[key],10)});
					}
				}
				
				//This will sort from greatest to smallest
				var repRowsSorted = repRowsNotSorted.slice(0);
				var repBarsSorted = repBarsNotSorted.slice(0);
				
				repRowsSorted.sort(function(a,b) {return b.times - a.times;});
				repBarsSorted.sort(function(a,b) {return b.requisition - a.requisition;});
				
				for(i=0; i<repRowsSorted.length; i++){
					REPORT_ROWS.push(repRowsSorted[i]);
				}
				
				//For the number of questions used a correction has to be done, removing the offset (a req with 7 questions is counted also in the 6, the 5, 4 ,3, 2, and 1 questions)
				var correctAccumulation = 0;
				//console.log(repBarsSorted);
				for(i=(repBarsSorted.length-1); i>=0; i--){
					//console.log((parseInt(repBarsSorted[i].REQUISITIONS,10)-correctAccumulation)>0);
					if((parseInt(repBarsSorted[i].REQUISITIONS,10)-correctAccumulation)>0){
					    REPORT_BARS.push({ QUESTIONS:parseInt(repBarsSorted[i].QUESTIONS,10), REQUISITIONS:parseInt((repBarsSorted[i].REQUISITIONS-correctAccumulation),10) });
					}
					correctAccumulation = parseInt(repBarsSorted[i].REQUISITIONS,10);
				}
				var monthNames = ["January", "February", "March", "April", "May", "June",
				  "July", "August", "September", "October", "November", "December"
				];
				var today = new Date();
				var date = today.getDate()+" of "+monthNames[today.getMonth()]+" "+today.getFullYear() + " at " + today.getHours()+":"+today.getMinutes() + "UTC";
				console.log(date);
				
				TIMESTAMP.push({ TIMEID: 101, DATE: date});
				
		
		}).catch(function(erroresSFSF){
		
				console.log("ERRORS CALLING SFSF API'S"); 
				console.log(erroresSFSF);
				console.log("UPLOADING MOCK DATA"); 
				
				REPORT_PIE = [
				{PERCENTAGE: 50, ABSOLUTE: 50, LABEL: "Yesss"},
				{PERCENTAGE: 51, ABSOLUTE: 50, LABEL: "Nooo"}];
				
				REPORT_ROWS = [
				{QUESID: 1, QUESTIONS: "Couldn't connect to SFSFffff", TIMES: 10},
				{QUESID: 2, QUESTIONS: "Is this a mock questionnnnn?", TIMES: 5},
				{QUESID: 3, QUESTIONS: "Is this a lazy questionnnnn?", TIMES: 2}];
				
				REPORT_BARS = [
				{QUESTIONS: 1, REQUISITIONS: 1},
				{QUESTIONS: 2, REQUISITIONS: 2},
				{QUESTIONS: 3, REQUISITIONS: 3}];
				
				REPORT_TABLE = [
				 {SQID: 10101,REQID: 101,QNAME: "Couldn't connect to SFSFfff",QTYPE: "Multi Choice",REQUIRED: "yes",DISQUALIFIER: "no",REQNAME: "Mock requisition title"},
				 {SQID: 10202,REQID: 102,QNAME: "Is this a mock question?????",QTYPE: "Multi Choice",REQUIRED: "yes",DISQUALIFIER: "yes",REQNAME: "Mock requisition title"},
				 {SQID: 10303,REQID: 103,QNAME: "Is this a lazy question?????",QTYPE: "Text",REQUIRED: "yes",DISQUALIFIER: "no",REQNAME: "Mock requisition title"}];
		
				TIMESTAMP = [{ TIMEID: 101, DATE: "1 of January of 1999 at 00:00"}]
			
	});
  
}