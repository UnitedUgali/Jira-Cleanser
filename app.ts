//=== 02.2023
/** 
 *  You need to install dotenv for this script to work.
 *  
 *  As for now 02.2023 it is safe to use this script to safely remove for the following components:
 *  Screens
 *  ScreenSchemes
 *  IssueTypeScreenSchemes
 *  Workflows
 *  WorkflowSchemes
 *  FieldConfigurations
 *  FieldConfigurationsSchemes
 *  
 *  The script is based on the assumption, that until now 02.2023 it is impossible to delete the upper components if they're still in use. 
 *  Verify first if this is still the case.  
 *  
 *  WARNING
 *  Do not modify the script to delete Fields, Issue Type Schemes or Issue Types as the script will delete all of them including all of their data from your Jira instance
 *  no matter whether they're in use or not! 
 * */

require('dotenv').config();
console.log(process.env.EMAIL);
const EMAIL = process.env.EMAIL;
const API_TOKEN = process.env.API_TOKEN;
const ATLASSIAN_URL = process.env.ATLASSIAN_URL
console.log(process.env.EMAIL);
console.log(process.env.ATLASSIAN_LOGIN);

import fetch from 'node-fetch';

//max entries from an issue type screen scheme request set by Atlassian (11.2022)
const pageLengthIssueTypeScreenScheme: number = 50;
const pageLengthIssueTypeScheme: number = 50;
//no page length for issue types defined => I just chose 5000
const pageLengthIssueTypes: number = 5000;
const pageLengthScreen: number = 100;
const pageLengthScreenScheme: number = 25;
const pageLengthWorkflow: number = 50;
const pageLengthWorkflowScheme: number = 50;
const pageLengthFieldConfiguration: number = 50;
const pageLengthFieldConfigurationScheme: number = 50;

/**The first part of the URL never changes when making calls to the Atlassian API
 * The method will append whatever argument it gets on the ATLASSIAN_URL-variable
 * and make an api call. This is until today 2.2023 how the Atlassian API works */
async function getAPICall(append: string): Promise<string> {
    //console.log("getAPICall: Started!");
    let url: string = ATLASSIAN_URL + append;
    //console.log('Calling: ' + url);
    let responseJSON = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Basic ${Buffer.from(
                EMAIL + ':' + API_TOKEN
            ).toString('base64')}`,
            'Accept': 'application/json'
        }
    });
    return responseJSON.text();
}

async function deleteAPICall(append: string): Promise<string> {
    //console.log("getAPICall: Started!");
    let url: string = ATLASSIAN_URL + append;
    //console.log('Calling: ' + url);
    let responseJSON = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Authorization': `Basic ${Buffer.from(
                EMAIL + ':' + API_TOKEN
            ).toString('base64')}`,
            'Accept': 'application/json'
        }
    });
    return responseJSON.text();
}

async function postAPICall(append: string, bodyData: string): Promise<string> {
    //console.log("postAPICall: Started!");
    let url: string = ATLASSIAN_URL + append;
    //console.log('Calling: ' + url);
    let responseJSON = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${Buffer.from(
                EMAIL + ':' + API_TOKEN
            ).toString('base64')}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: bodyData
    });
    return responseJSON.text();
}

/* This fuction creates 110 issue type screen schemes to test the paging of the deleteAllComponents function
 * The page size is 50 so the testdata of 110 should create sufficient data. What I can't test is when more than 50 issue type screen schemes
 * Are not deletable as I don't have as many projects */
async function createIssueTypeScreenSchemeTestData() {
    let body: object;
    for (let i = 0; i < 110; i++) {
        body = {
            name: "itss" + i,
            issueTypeMappings: [{
                issueTypeId: "default",
                screenSchemeId: "1"
            }]
        };
        console.log(body);
        //JSON.parse -> Creates JSON object from string, JSON.stringify converts JSON object into string
        let response = await postAPICall("issuetypescreenscheme", JSON.stringify(body));
        console.log(response);
    }
}


/**This function works for:
 * fieldconfiguration
 * fieldconfigurationscheme
 * workflowscheme
 * screens
 * screenscheme
 * issuetypescreenschemes because in all of those methods  the JSON file you GET looks the same (1.12.2022)
 * 
 * */
async function deleteAllComponents(append: string, pageLength: number) {
    console.log("deleteAllComponents: Started!");
    let success: any;
    let current_page: string;
    let previous_page: string;
    let previous_page_json: any = { "key": "value" };
    let current_page_json: any;
    //The value startAt will always be between 0 and the pageLength
    let startAt: number = 0;
    //this loop is iterating through all pages
    current_page = await getAPICall(append + "?startAt=" + startAt);
    current_page_json = JSON.parse(current_page);
    for (let i = 0; i < current_page_json.values.length; i++) {
        console.log("deleteAllComponents: We delete now: " + current_page_json.values[i].name);
        success = await deleteAPICall(append + "/" + current_page_json.values[i].id);
        console.log(success);
    }
    previous_page = current_page;

    do {
        current_page = await getAPICall(append + "?startAt=" + startAt);
        //console.log(current_page);
        current_page_json = JSON.parse(current_page);
        previous_page_json = JSON.parse(previous_page);
        /* with the following for loop I first want to compare the current page with the previous page.
         * When Jira is unable to delete something it will just leave it where it is.
         * So the component will then remain in the page. If we do not intercept this
         * our programm will just keep running down the entire page calling the api when trying to
         * delete a component it already tried to delete before. In order to avoid this
         * I want to compare the elements from the current new page
         * with the previous page and skip all the elements, which we already tried to delete and
         * set the pageIndex to the first element which is differeing because this might 
         * now be a new component, which might be deletable.
         * 
         * */

        //Because the first time the previous page will be empty so we have to intercept that
        if (current_page_json.values) {
            for (let i = 0; i < current_page_json.values.length; i++) {
                //if the component value from the current page hasn't appeared already on a previous page...'
                if (current_page_json.values[i].id != previous_page_json.values[i].id) {
                    console.log("deleteAllComponents: We delete now: " + current_page_json.values[i].name);
                    success = await deleteAPICall(append + "/" + current_page_json.values[i].id);
                    console.log(success);
                }
            }
        }
        else {
            console.log("deleteAllComponents: We've reached the end of the page. Function stopped!");
            return;
        }
        //If the current page is the same as the previous page it means nothing was deleted 
        //which means nothing _can_ be deleted anymore and we therefore have to move to the next page
        if (current_page == previous_page) {
            startAt += pageLength;
        }
        previous_page = current_page;

    } while (current_page_json.values.length == pageLength)
}



//Same function like the deleteAllComponents just with a slightly different handling of the response JSON objects
async function deleteAllWorkflows(pageLength: number) {
    console.log("deleteAllWorkflows: Started!");
    let success: any;
    let current_page: string;
    let previous_page: string;
    let previous_page_json: any = { "key": "value" };
    let current_page_json: any;
    //The value startAt will always be between 0 and the pageLength
    let startAt: number = 0;
    //this loop is iterating through all pages
    current_page = await getAPICall("workflow/search?startAt=" + startAt);
    current_page_json = JSON.parse(current_page);
    for (let i = 0; i < current_page_json.values.length; i++) {
        console.log("deleteAllWorkflows: We delete now: " + current_page_json.values[i].id.name);
        success = await deleteAPICall("workflow/" + current_page_json.values[i].id.entityId);
        console.log(success);
    }
    previous_page = current_page;

    do {
        current_page = await getAPICall("workflow/search?startAt=" + startAt);
        //console.log(current_page);
        current_page_json = JSON.parse(current_page);
        previous_page_json = JSON.parse(previous_page);
        if (current_page_json.values) {
            for (let i = 0; i < current_page_json.values.length; i++) {
                //if the component value from the current page hasn't appeared already on a previous page...'
                if (current_page_json.values[i].id != previous_page_json.values[i].id) {
                    console.log("deleteAllWorkflows: We delete now: " + current_page_json.values[i].id.name);
                    success = await deleteAPICall("workflow/" + current_page_json.values[i].id.entityId);
                    console.log(success);

                }
            }
        }
        else {
            console.log("deleteAllWorkflows: We've reached the end of the page. Function stopped!");
            return;
        }
        if (current_page == previous_page) {
            startAt += pageLength;
        }
        previous_page = current_page;

    } while (current_page_json.values.length == pageLength)
}


/** DO NOT USE UNLESS YOU WANT TO DELETE ALL FIELDS

async function deleteAllFields(pageLength: number) {
    console.log("deleteAllFields: Started!");
    let success: any;
    let current_page: string;
    let previous_page: string;
    let previous_page_json: any = { "key": "value" };
    let current_page_json: any;
    //The value startAt will always be between 0 and the pageLength
    let startAt: number = 0;
    //this loop is iterating through all pages
    current_page = await getAPICall("field?startAt=" + startAt);
    console.log(current_page);
    current_page_json = JSON.parse(current_page);
    for (let i = 0; i < current_page_json.length; i++) {
        console.log("deleteAllFields: We delete now: " + current_page_json[i].name);
        success = await deleteAPICall("field/" + current_page_json[i].id);
        console.log(success);
    }
    previous_page = current_page;

    do {
        current_page = await getAPICall("field?startAt=" + startAt);
        //console.log(current_page);
        current_page_json = JSON.parse(current_page);
        previous_page_json = JSON.parse(previous_page);
        if (current_page_json) {
            for (let i = 0; i < current_page_json.length; i++) {
            //if the component value from the current page hasn't appeared already on a previous page...'
                if (current_page_json[i].id != previous_page_json[i].id) {
                    console.log("deleteAllFields: We delete now: " + current_page_json[i].name);
                    success = await deleteAPICall("field/" + current_page_json[i].id);
                    console.log(success);
                }
            }
        }
        else {
            console.log("deleteAllFields: We've reached the end of the page. Function stopped!");
            return;
        }
        if (current_page == previous_page) {
            startAt += pageLength;
        }
        previous_page = current_page;

    } while (current_page_json.length == pageLength)

    
    DO NOT USE UNLESS YOU WANT TO DELETE ALL ISSUETYPES

async function deleteAllIssueTypes(pageLength: number) {
    console.log("deleteAllIssueTypes: Started!");
    let success: any;
    let current_page: string;
    let previous_page: string;
    let previous_page_json: any = { "key": "value" };
    let current_page_json: any;
    //The value startAt will always be between 0 and the pageLength
    let startAt: number = 0;
    //this loop is iterating through all pages
    current_page = await getAPICall("issuetype?startAt=" + startAt);
    console.log(current_page);
    current_page_json = JSON.parse(current_page);
    for (let i = 0; i < current_page_json.length; i++) {
        console.log("deleteAllIssueTypes: We delete now: " + current_page_json[i].name);
        success = await deleteAPICall("issuetype/" + current_page_json[i].id);
        console.log(success);
    }
    previous_page = current_page;

    do {
        current_page = await getAPICall("issuetype?startAt=" + startAt);
        //console.log(current_page);
        current_page_json = JSON.parse(current_page);
        previous_page_json = JSON.parse(previous_page);
        if (current_page_json) {
            for (let i = 0; i < current_page_json.length; i++) {
            //if the component value from the current page hasn't appeared already on a previous page...'
                if (current_page_json[i].id != previous_page_json[i].id) {
                    console.log("deleteAllIssueTypes: We delete now: " + current_page_json[i].name);
                    success = await deleteAPICall("issuetype/" + current_page_json[i].id);
                    console.log(success);
                }
            }
        }
        else {
            console.log("deleteAllIssueTypes: We've reached the end of the page. Function stopped!");
            return;
        }
        if (current_page == previous_page) {
            startAt += pageLength;
        }
        previous_page = current_page;

    } while (current_page_json.length == pageLength)
}

}  */


/**
I recommend running each function on it's own while keeping the others commented out 
*/
//deleteAllComponents("fieldconfigurationscheme", pageLengthFieldConfigurationScheme);
//deleteAllComponents("fieldconfiguration", pageLengthFieldConfiguration);
//deleteAllComponents("workflowscheme", pageLengthWorkflowScheme);
//deleteAllWorkflows(pageLengthWorkflow);
//deleteAllComponents("issuetypescreenscheme", pageLengthIssueTypeScreenScheme);
//deleteAllComponents("screenscheme", pageLengthScreenScheme);
//deleteAllComponents("screens", pageLengthScreen);

