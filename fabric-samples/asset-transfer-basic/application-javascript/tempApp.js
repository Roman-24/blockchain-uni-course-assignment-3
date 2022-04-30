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
const { buildCCPOrg1, buildWallet } = require('../../test-application/javascript/AppUtil.js');

const channelName = 'mychannel';
const chaincodeName = 'basic';
const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
const org1UserId = 'appUser';

function prettyJSONString(inputString) {
    return JSON.stringify(JSON.parse(inputString), null, 2);
}

// pre-requisites:
// - fabric-sample two organization test-network setup with two peers, ordering service,
//   and 2 certificate authorities
//         ===> from directory /fabric-samples/test-network
//         ./network.sh up createChannel -ca
// - Use any of the asset-transfer-basic chaincodes deployed on the channel "mychannel"
//   with the chaincode name of "basic". The following deploy command will package,
//   install, approve, and commit the javascript chaincode, all the actions it takes
//   to deploy a chaincode to a channel.
//         ===> from directory /fabric-samples/test-network
//         ./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-javascript/ -ccl javascript
// - Be sure that node.js is installed
//         ===> from directory /fabric-samples/asset-transfer-basic/application-javascript
//         node -v
// - npm installed code dependencies
//         ===> from directory /fabric-samples/asset-transfer-basic/application-javascript
//         npm install
// - to run this test application
//         ===> from directory /fabric-samples/asset-transfer-basic/application-javascript
//         node app.js

// NOTE: If you see  kind an error like these:
/*
    2020-08-07T20:23:17.590Z - error: [DiscoveryService]: send[mychannel] - Channel:mychannel received discovery error:access denied
    ******** FAILED to run the application: Error: DiscoveryService: mychannel error: access denied

   OR

   Failed to register user : Error: fabric-ca request register failed with errors [[ { code: 20, message: 'Authentication failure' } ]]
   ******** FAILED to run the application: Error: Identity not found in wallet: appUser
*/
// Delete the /fabric-samples/asset-transfer-basic/application-javascript/wallet directory
// and retry this application.
//
// The certificate authority must have been restarted and the saved certificates for the
// admin and application user are not valid. Deleting the wallet store will force these to be reset
// with the new certificate authority.
//

/**
 *  A test application to show basic queries operations with any of the asset-transfer-basic chaincodes
 *   -- How to submit a transaction
 *   -- How to query and check the results
 *
 * To see the SDK workings, try setting the logging to show on the console before running
 *        export HFC_LOGGING='{"debug":"console"}'
 */
async function main() {
    try {
        // build an in memory object with the network configuration (also known as a connection profile)
        const ccp = buildCCPOrg1();

        // build an instance of the fabric ca services client based on
        // the information in the network configuration
        const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');

        // setup the wallet to hold the credentials of the application user
        const wallet = await buildWallet(Wallets, walletPath);

        // in a real application this would be done on an administrative flow, and only once
        await enrollAdmin(caClient, wallet, mspOrg1);

        // in a real application this would be done only when a new user was required to be added
        // and would be part of an administrative flow
        await registerAndEnrollUser(caClient, wallet, mspOrg1, org1UserId, 'org1.department1');

        // Create a new gateway instance for interacting with the fabric network.
        // In a real application this would be done as the backend server session is setup for
        // a user that has been verified.
        const gateway = new Gateway();

        try {
            // setup the gateway instance
            // The user will now be able to create connections to the fabric network and be able to
            // submit transactions and query. All transactions submitted by this gateway will be
            // signed by this user using the credentials stored in the wallet.
            await gateway.connect(ccp, {
                wallet,
                identity: org1UserId,
                discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
            });

            // Build a network instance based on the channel where the smart contract is deployed
            const network = await gateway.getNetwork(channelName);

            // Get the contract from the network.
            const contract = network.getContract(chaincodeName);

            // Initialize a set of asset data on the channel using the chaincode 'InitLedger' function.
            // This type of transaction would only be run once by an application the first time it was started after it
            // deployed the first time. Any updates to the chaincode deployed later would likely not need to run
            // an "init" type function.
            console.log('\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger');
            await contract.submitTransaction('InitLedger');
            console.log('*** Result: committed');

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
                                    initial: '',
                                });
								const result = await contract.submitTransaction('CreateAsset', responseFlyFrom.flyFrom, responseFlyTo.flyTo, responseDateTimeDeparture.dateTimeDeparture, responseAvailablePlaces.availablePlaces);
                            })();
                            
                        }
						else if (response2.airlineAction == "getAllAssets") {
							const result = await contract.evaluateTransaction('GetAllAssets');
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