/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

// Deterministic JSON.stringify()
const stringify  = require('json-stringify-deterministic');
const sortKeysRecursive  = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');

class AssetTransfer extends Contract {

    async InitLedger(ctx) {

        console.info('============= START : Initialize Ledger ===========');

        const flights = [
            {
                flightNr: "EC001",
                flyFrom: "BUD",
                flyTo: "TXL",
                dateTimeDeparture: 05032021-1034,
                availablePlaces: 100,
            },
            {
                flightNr: "BS015",
                flyFrom: "MUC",
                flyTo: "LIS",
                dateTimeDeparture: 10042021-2157,
                availablePlaces: 150,
            },
        ];

        for (const flight of flights) {
            flight.docType = 'flight';
            // example of how to write to world state deterministically
            // use convetion of alphabetic order
            // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
            // when retrieving data, in any lang, the order of data will be the same and consequently also the corresonding hash
            await ctx.stub.putState(flight.flightNr, Buffer.from(stringify(sortKeysRecursive(flight))));
        }
    }

    // CreateAsset issues a new asset to the world state with given details.
    // create flight
    async CreateAsset(ctx, flyFrom, flyTo, dateTimeDeparture, availablePlaces) {

        // chceck if function caller is an organization
        const isAeroline = await this.isAeroline(ctx);
        if (isAeroline == false) {
            throw new Error('Only organizations can create assets');
        }

        const exists = await this.AssetExists(ctx, flightNr);
        if (exists) {
            throw new Error(`The asset ${flightNr} already exists`);
        }

        // get organization name from function caller
        const mspid = ctx.clientIdentity.getMSPID();
        const orgName = mspid.split('MSP')[0];

        do {
            // generate random int form 0 to 999
            const randomInt = Math.floor(Math.random() * 1000);
            // https://stackoverflow.com/questions/1127905/how-can-i-format-an-integer-to-a-specific-length-in-javascript
            randomInt = randomInt.toString().padStart(3, '0');

            if (orgName == 'Org1') {
                const flightName = 'EC';
            } else if ( orgName == 'Org2' ) {
                const flightName = 'BS';
            }

            const flightNr = flightName + randomInt;
        } while (await this.AssetExists(ctx, flightNr) == false);
        

        const flight = {
            flightNr: flightNr,
            flyFrom: flyFrom,
            flyTo: flyTo,
            dateTimeDeparture: dateTimeDeparture,
            availablePlaces: availablePlaces,
            reservations: {},
        };

        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(flightNr, Buffer.from(stringify(sortKeysRecursive(flight))));
        return JSON.stringify(flight);
    }

    // ReadAsset returns the asset stored in the world state with given id.
    async ReadAsset(ctx, flightNr) {

        // get the asset from chaincode state
        const assetJSON = await ctx.stub.getState(flightNr); 
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${flightNr} does not exist`);
        }
        return assetJSON.toString();
    }

    // UpdateAsset updates an existing asset in the world state with provided parameters.
    async UpdateAsset(ctx, flightNr, flyFrom, flyTo, dateTimeDeparture, availablePlaces) {

        // asset must exist for update
        const exists = await this.AssetExists(ctx, flightNr);
        if (exists == false) {
            throw new Error(`The asset ${flightNr} does not exist`);
        }

        // get the asset from chaincode state
        const flightJSON = await ctx.stub.getState(flightNr);
        const flight = JSON.parse(flightJSON.toString());
        reservations = flight[reservations];

        // overwriting original asset with new asset
        const updatedFlight = {
            flightNr: flightNr,
            flyFrom: flyFrom,
            flyTo: flyTo,
            dateTimeDeparture: dateTimeDeparture,
            availablePlaces: availablePlaces,
            reservations: reservations,
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        return ctx.stub.putState(flightNr, Buffer.from(stringify(sortKeysRecursive(updatedAsset))));
    }

    // DeleteAsset deletes an given asset from the world state.
    async DeleteAsset(ctx, flightNr) {

        const exists = await this.AssetExists(ctx, flightNr);
        if (exists == false) {
            throw new Error(`The asset ${flightNr} does not exist`);
        }
        return ctx.stub.deleteState(flightNr);
    }

    // GetAllAssets returns all assets found in the world state.
    async GetAllAssets(ctx) {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }

    // function allowing the aerolines to complete the reservation of a travel agency
    async bookSeats(ctx, flightNr) {
    
        // check if function caller is an aeroline
        const isAeroline = await this.isAeroline(ctx);
        if (isAeroline == false) {
            throw new Error('Only aerolines can reserve seats');
        }

        // asset must exist for additing reservation
        const exists = await this.AssetExists(ctx, flightNr);
        if (exists == false) {
            throw new Error(`The asset ${flightNr} does not exist`);
        }

        // get the flight from chaincode state
        const flightJSON = await ctx.stub.getState(flightNr);
        const flight = JSON.parse(flightJSON.toString());

        // get no of available places
        const availablePlaces = flight.availablePlaces;

        // get reservations from the flight
        const reservations = flight.reservations;

        // iterate the reservations
        for (const reservation in reservations) {
            // check the state of the reservation
            if (reservations[reservation].state == 0) {
                // check if there are more available places than reservation number of seats
                if (availablePlaces >= reservations[reservation].seats) {

                    // if the reservation is in state 0, it means that the travel agency has not confirmed the reservation
                    // therefore, we can add the reservation to the flight
                    reservations[reservation].state = 1;
                    availablePlaces -= reservations[reservation].seats;
                }
                // if there are not enough available places, we can't add the reservation
                else {
                    reservations[reservation].state = 2;
                    // print to console that the reservation was not added
                    console.log(`The reservation ${reservation} was not added to the flight ${flightNr} due to the lack of free places`);
                }
            }
        }

        // overwriting original asset with new asset
        const updatedFlight = {
            flightNr: flightNr,
            flyFrom: flyFrom,
            flyTo: flyTo,
            dateTimeDeparture: dateTimeDeparture,
            availablePlaces: availablePlaces,
            reservations: reservations,
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        return ctx.stub.putState(flightNr, Buffer.from(stringify(sortKeysRecursive(updatedAsset)))); 
    }

    // function alowing the travel agency to reserve a number of seats on a flight
    async reserveSeats(ctx, flightNr, number) {

        // check if function caller is a travel agency
        const isTravelAgency = await this.isTravelAgency(ctx);
        if (isTravelAgency == false) {
            throw new Error('Only travel agencies can book seats');
        } 

        // asset must exist for additing reservation
        const exists = await this.AssetExists(ctx, flightNr);
        if (exists == false) {
            throw new Error(`The asset ${flightNr} does not exist`);
        }

        do {
            let reservationNrTemp = flightNr + "-" + Math.floor(Math.random() * 1000).toString(16);
        } while (reservations[reservationNrTemp] == undefined)
        
        const reservation = {
            flightNr: flightNr,
            numberOfSeats: number,
            // state 0 -> pending
            // state 1 -> comfirmed (booked)
            // state 2 -> canceled
            state: 0,
            // random integer from 0 to 999 in hex value
            reservationNr: reservationNrTemp,
        };

        // get the reservations from chaincode state
        const flightJSON = await ctx.stub.getState(flightNr);
        flight = JSON.parse(flightJSON.toString());
        reservations = flight[reservations];
        // add reservation to flight
        reservations.push(reservation);

        // overwriting original asset with new asset
        const updatedFlight = {
            flightNr: flightNr,
            flyFrom: flyFrom,
            flyTo: flyTo,
            dateTimeDeparture: dateTimeDeparture,
            availablePlaces: availablePlaces,
            reservations: reservations,
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        return ctx.stub.putState(flightNr, Buffer.from(stringify(sortKeysRecursive(updatedAsset))));    
    }

    async checkIn(ctx, reservationNr, passportIDs) {

    } 

    // ======================== HELPER FUNCTIONS ========================

    // AssetExists returns true when asset with given ID exists in world state.
    async AssetExists(ctx, flightNr) {

        // get the asset from chaincode state
        const flightJSON = await ctx.stub.getState(flightNr);
        const exists = (flightJSON.toString() != '');
        return exists && flightJSON.length > 0;
    }

    // isAeroline returns true if the function caller is an aeroline.
    isAeroline(ctx) {
        const mspid = ctx.clientIdentity.getMSPID();
        if (mspid === 'Org1MSP' || mspid === 'Org2MSP') {
            return true;
        }
        return false;
    }

    // isTravelAgency returns true if the function caller is a travel agency.
    isTravelAgency(ctx) {
        const mspid = ctx.clientIdentity.getMSPID();
        if (mspid === 'Org3MSP') {
            return true;
        }
        return false;
    }

}

module.exports = AssetTransfer;
