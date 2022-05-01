/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../../test-application/javascript/CAUtil.js');
const { buildCCPOrg1, buildCCPOrg2, buildCCPOrg3, buildWallet } = require('../../test-application/javascript/AppUtil.js');

const channelName = 'mychannel';
const chaincodeName = 'basic';

function makeAeroplane() {
    console.log("");
    console.log("            ______");
    console.log("            _\ _~-\___");
    console.log("    =  = ==(____AA____D");
    console.log("                \_____\___________________,-~~~~~~~`-.._");
    console.log("                /     o O o o o o O O o o o o o o O o  |\_");
    console.log("                `~-.__        ___..----..                  )");
    console.log("                      `---~~\___________/------------`````");
    console.log("                      =  ===(_________D");
    console.log("");
}

function prettyJSONString(inputString) {
    return JSON.stringify(JSON.parse(inputString), null, 2);
}

/*
 * To see the SDK workings, try setting the logging to show on the console before running
 *        export HFC_LOGGING='{"debug":"console"}'
 */
async function main() {
    try {
        const mspOrg1 = 'Org1MSP'; // EconFly
        const org1UserId = 'appUser';
        const mspOrg2 = "Org2MSP"; // BusiFly
        const org2UserId = 'appUser';
        const mspOrg3 = "Org3MSP"; // others
        const org3UserId = 'appUser';

        // build an in memory object with the network configuration (also known as a connection profile)
        const ccp1 = buildCCPOrg1();
        const ccp2 = buildCCPOrg2();
        const ccp3 = buildCCPOrg3();

        // build an instance of the fabric ca services client based on
        // the information in the network configuration
        const caClient1 = buildCAClient(FabricCAServices, ccp1, 'ca.org1.example.com');
        const caClient2 = buildCAClient(FabricCAServices, ccp2, 'ca.org2.example.com');
        const caClient3 = buildCAClient(FabricCAServices, ccp3, 'ca.org3.example.com');

        // setup the wallet to hold the credentials of the application user
        let wallet1 = await buildWallet(Wallets, path.join(__dirname, 'wallet', "1"));
        let wallet2 = await buildWallet(Wallets, path.join(__dirname, 'wallet', "2"));
        let wallet3 = await buildWallet(Wallets, path.join(__dirname, 'wallet', "3"));

        // in a real application this would be done on an administrative flow, and only once
        await enrollAdmin(caClient1, wallet1, mspOrg1);
        await enrollAdmin(caClient2, wallet2, mspOrg2);
        await enrollAdmin(caClient3, wallet3, mspOrg3);

        // in a real application this would be done only when a new user was required to be added
        // and would be part of an administrative flow
        await registerAndEnrollUser(caClient1, wallet1, mspOrg1, org1UserId, 'org1.department1');
        await registerAndEnrollUser(caClient2, wallet2, mspOrg2, org2UserId, 'org2.department1');
        await registerAndEnrollUser(caClient3, wallet3, mspOrg3, org3UserId);

        // Create a new gateway instance for interacting with the fabric network.
        // In a real application this would be done as the backend server session is setup for
        // a user that has been verified.
        let gateway = new Gateway();

        // Initialize a set of asset data on the channel using the chaincode 'InitLedger' function.
        // This type of transaction would only be run once by an application the first time it was started after it
        // deployed the first time. Any updates to the chaincode deployed later would likely not need to run
        // an "init" type function.
        //await contract.submitTransaction('InitLedger');

        try {

            makeAeroplane();

            const prompts = require('prompts');
            let interfaseOn = true
            while (interfaseOn) {

                // get user type -------------------------------------
                let responseOfUserType;
                await (async() => {
                    responseOfUserType = await prompts({
                        type: 'select',
                        name: 'user',
                        message: 'What type of user you are?',
                        choices: [
                            { title: 'TravelAgency', value: 1 },
                            { title: 'EconFly', value: 2 },
                            { title: 'BusiFly', value: 3 },
                            { title: 'Customer', value: 4 },
                            { title: 'Exit', value: 5 },
                        ],
                        initial: 1
                    });
                })();

                await (async() => {

                    // login user ----------------------------------------
                    // travel agency
                    if (responseOfUserType.user == 1) {

                        await gateway.connect(ccp3, { wallet3, identity: org3UserId, discovery: { enabled: true, asLocalhost: true } });
                        const network = await gateway.getNetwork(channelName);
                        const contract = await network.getContract(chaincodeName);

                        let responseOfTravelAgency;
                        await (async() => {
                            responseOfTravelAgency = await prompts({
                                type: 'select',
                                name: 'travelAgencyAction',
                                message: 'What you want to do?',
                                initial: 1,
                                choices: [
                                    { tittle: "Chcek in", value: "checkIn" },
                                    { tittle: "Reserve seats", value: "reserveSeats" },
                                ],
                            });
                        })();

                        // reserve seats
                        if (responseOfTravelAgency.travelAgencyAction == "reserveSeats") {
                            let flightNrForFind, numOfseat;

                            await (async() => {
                                flightNrForFind = await prompts({
                                    type: 'text',
                                    name: 'val',
                                    message: 'Enter flight number for find: ',
                                    initial: '',
                                    validate: flightNrForFind => flightNrForFind.length == 5 ? true : 'Please enter a valid flight number'
                                });
                                numOfseat = await prompts({
                                    type: 'number',
                                    name: 'val',
                                    message: 'Enter number of setas witch you want: ',
                                    initial: '',
                                });
                            })();

                            let result = await contract.submitTransaction('reserveSeats', flightNrForFind.val.toString(), numOfseat.val.toString());
                            if (`${result}` !== '') {
                                console.log(`*** Result: ${prettyJSONString(result.toString())}`);
                            }
                        }
                        console.log("odpajam sa");
                        gateway.disconnect();
                    }
                    // airline
                    else if (responseOfUserType.user == 2 || responseOfUserType.user == 3) {

                        let orgUser, wallet, ccp;
                        if (responseOfUserType.user == 2) {
                            orgUser = org1UserId;
                            wallet = wallet1
                            ccp = ccp1
                        } else if (responseOfUserType.user == 3) {
                            orgUser = org2UserId
                            wallet = wallet2
                            ccp = ccp2
                        }

                        await gateway.connect(ccp, { wallet, identity: orgUser, discovery: { enabled: true, asLocalhost: true } });
                        const network = await gateway.getNetwork(channelName);
                        const contract = await network.getContract(chaincodeName);

                        // display menu choices (functions)
                        let response2;
                        await (async() => {
                            response2 = await prompts({
                                type: 'select',
                                name: 'airlineAction',
                                message: 'What you want to do?',
                                choices: [
                                    { title: 'Create flight', value: "createAsset" },
                                    { title: 'Get all flights', value: "getAllAssets" },
                                    { title: 'Get flight by flight number', value: "readAsset" },
                                    { title: 'Book seats', value: "bookSeats" },
                                    { title: 'Edit flight', value: "updateAsset" }
                                ],
                                initial: 1
                            });
                        })();

                        if (response2.airlineAction == "createAsset") {
                            // create flight
                            await (async() => {
                                const responseFlyFrom = await prompts({
                                    type: 'text',
                                    name: 'flyFrom',
                                    message: 'Enter fly from: ',
                                    initial: '',
                                    validate: flyFrom => flyFrom.length > 0 ? true : 'Please enter a valid fly from'
                                });
                                const responseFlyTo = await prompts({
                                    type: 'text',
                                    name: 'flyTo',
                                    message: 'Enter fly to: ',
                                    initial: '',
                                    validate: flyTo => flyTo.length > 0 ? true : 'Please enter a valid fly to'
                                });
                                const responseDateTimeDeparture = await prompts({
                                    type: 'text',
                                    name: 'dateTimeDeparture',
                                    message: 'Enter date time departure: ',
                                    initial: '',
                                    validate: dateTimeDeparture => dateTimeDeparture.length > 0 ? true : 'Please enter a valid date'
                                });
                                const responseAvailablePlaces = await prompts({
                                    type: 'number',
                                    name: 'availablePlaces',
                                    message: 'Enter available places: ',
                                    initial: '256',
                                });

                                let result = await contract.submitTransaction('createAsset', responseFlyFrom.flyFrom.toString(), responseFlyTo.flyTo.toString(), responseDateTimeDeparture.dateTimeDeparture.toString(), responseAvailablePlaces.availablePlaces.toString());
                                if (`${result}` !== '') {
                                    console.log(`*** Result: ${prettyJSONString(result.toString())}`);
                                }

                            })();

                        } else if (response2.airlineAction == "getAllAssets") {
                            const result = await contract.evaluateTransaction('getAllAssets');
                            console.log(`*** Result: ${prettyJSONString(result.toString())}`);
                        } else if (response2.airlineAction == "readAsset") {
                            const flightNrForFind = await prompts({
                                type: 'text',
                                name: 'val',
                                message: 'Enter flight number for find: ',
                                initial: '',
                                validate: flightNrForFind => flightNrForFind.length == 5 ? true : 'Please enter a valid flight number'
                            });
                            let result = await contract.evaluateTransaction('readAsset', flightNrForFind.val.toString());
                            console.log(`*** Result: ${prettyJSONString(result.toString())}`);
                        }
                        console.log("odpajam sa");
                        gateway.disconnect();
                    }
                    // user
                    else if (responseOfUserType.user == 4) {
                        // display menu choices (functions)
                        await (async() => {
                            const response2 = await prompts({
                                type: 'select',
                                name: 'function',
                                message: 'What you want to do?',
                                choices: [
                                    { title: 'Get flight by flight number', value: "readAsset" },
                                    { title: 'Make reservation', value: "reserveSeats" },
                                ],
                                initial: 1
                            });
                        })();
                    }
                    // exit
                    else if (responseOfUserType.user == 5) {
                        interfaseOn = false;
                    }
                })();
            } // while loop end

        } finally {
            // Disconnect from the gateway when the application is closing
            // This will close all connections to the network
            gateway.disconnect();
        }
    } catch (error) {
        console.error(`******** FAILED to run the application: ${error}`);
    }
}

main();