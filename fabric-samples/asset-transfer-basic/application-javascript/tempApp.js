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

function prettyJSONString(inputString) {
    return JSON.stringify(JSON.parse(inputString), null, 2);
}

/*
 * To see the SDK workings, try setting the logging to show on the console before running
 *        export HFC_LOGGING='{"debug":"console"}'
 */
async function main() {
    try {

		// Create a new gateway instance for interacting with the fabric network.
		// In a real application this would be done as the backend server session is setup for
		// a user that has been verified.
		let gateway = new Gateway();

		const mspOrg1 = 'Org1MSP'; // EconFly
		const org1UserId = 'appUser';
		const mspOrg2 = "Org2MSP"; // BusiFly
		const org2UserId = 'appUser';
		const mspOrg3 = "Org3MSP"; // others
		const org3UserId = 'appUser';

		// build an in memory object with the network configuration (also known as a connection profile)
		const ccp1 = buildCCPOrg1(1);
		const ccp2 = buildCCPOrg2(1);
		const ccp3 = buildCCPOrg3(1);

		// build an instance of the fabric ca services client based on
		// the information in the network configuration
		const caClient1 = buildCAClient(FabricCAServices, ccp1, 'ca.org1.example.com');
		const caClient2 = buildCAClient(FabricCAServices, ccp2, 'ca.org2.example.com');
		const caClient3 = buildCAClient(FabricCAServices, ccp3, 'ca.org3.example.com');

		// setup the wallet to hold the credentials of the application user
		const wallet1 = await buildWallet(Wallets, path.join(__dirname, 'wallet', "1"));
		const wallet2 = await buildWallet(Wallets, path.join(__dirname, 'wallet', "2"));
		const wallet3 = await buildWallet(Wallets, path.join(__dirname, 'wallet', "3"));

		// in a real application this would be done on an administrative flow, and only once
		await enrollAdmin(caClient1, wallet1, mspOrg1);
		await enrollAdmin(caClient2, wallet2, mspOrg2);
		await enrollAdmin(caClient3, wallet3, mspOrg3);

		// in a real application this would be done only when a new user was required to be added
		// and would be part of an administrative flow
		await registerAndEnrollUser(caClient1, wallet1, mspOrg1, org1UserId, 'org1.department1');
		await registerAndEnrollUser(caClient2, wallet2, mspOrg2, org2UserId, 'org2.department2');
		await registerAndEnrollUser(caClient3, wallet3, mspOrg3, org3UserId, 'org3.department3');

		// Initialize a set of asset data on the channel using the chaincode 'InitLedger' function.
		// This type of transaction would only be run once by an application the first time it was started after it
		// deployed the first time. Any updates to the chaincode deployed later would likely not need to run
		// an "init" type function.
		//await contract.submitTransaction('InitLedger');
	
        try {

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
						const contract = network.getContract(chaincodeName);

                        // display menu choices (functions)
                        let response2;
                        await (async() => {
                            response2 = await prompts({
                                type: 'select',
                                name: 'airlineAction',
                                message: 'What you want to do?',
                                choices: [
                                    { title: 'Create flight', value: "CreateAsset" },
                                    { title: 'Get all flights', value: "GetAllAssets" },
                                    { title: 'Get flight by flight number', value: "ReadAsset" },
                                    { title: 'Book seats', value: "bookSeats" },
                                    { title: 'Edit flight', value: "updateAsset" }
                                ],
                                initial: 1
                            });
                        })();

                        if (response2.airlineAction == "CreateAsset") {
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
								let result = await contract.submitTransaction('CreateAsset', responseFlyFrom.flyFrom.toString(), responseFlyTo.flyTo.toString(), responseDateTimeDeparture.dateTimeDeparture.toString(), responseAvailablePlaces.availablePlaces.toString());
								if (`${result}` !== '') {
									console.log(`*** Result: ${prettyJSONString(result.toString())}`);
								}
							})();
                            
                        }
						else if (response2.airlineAction == "GetAllAssets") {
							const result = await contract.evaluateTransaction('GetAllAssets');
							console.log(`*** Result: ${prettyJSONString(result.toString())}`);
						}
						else if (response2.airlineAction == "ReadAsset") {
							const flightNrForFind = await prompts({
								type: 'text',
								name: 'val',
								message: 'Enter flight number for find: ',
								initial: '',
								validate: flightNrForFind => flightNrForFind.length == 5 ? true : 'Please enter a valid flight number'
							});
							let result = await contract.evaluateTransaction('ReadAsset', flightNrForFind.val.toString());
							console.log(`*** Result: ${prettyJSONString(result.toString())}`);
						}
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
									{ title: 'Get flight by flight number', value: "ReadAsset" },
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