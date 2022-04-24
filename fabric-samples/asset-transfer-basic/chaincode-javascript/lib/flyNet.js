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

class FlyNet extends Contract {

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
            flight.docType = 'asset';
            // example of how to write to world state deterministically
            // use convetion of alphabetic order
            // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
            // when retrieving data, in any lang, the order of data will be the same and consequently also the corresonding hash
            await ctx.stub.putState(flight.flightNr, Buffer.from(stringify(sortKeysRecursive(asset))));
        }
    }

    // CreateAsset issues a new asset to the world state with given details.
    async CreateFlight(ctx, flyFrom, flyTo, dateTimeDeparture, availablePlaces) {

        let ret = ctx.stub.getFunctionAndParameters();
        console.info("my_log ret: ", ret);

        // crate uuid for new asset
        let flightNr = ctx.GetStub().GetCreator() + "-" + ctx.GetStub().GetTxID();
        console.info("my_log flightNr: ", flightNr);

        const exists = await this.AssetExists(ctx, flightNr);
        if (exists) {
            throw new Error(`The asset ${flightNr} already exists`);
        }

        const flight = {
            flightNr: flightNr,
            flyFrom: flyFrom,
            flyTo: flyTo,
            dateTimeDeparture: dateTimeDeparture,
            availablePlaces: availablePlaces,
        };

        //we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(flightNr, Buffer.from(stringify(sortKeysRecursive(flight))));
        return JSON.stringify(asset);
    }

    // ReadAsset returns the asset stored in the world state with given id.
    async ReadAsset(ctx, flightNr) {
        const assetJSON = await ctx.stub.getState(flightNr); // get the asset from chaincode state
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${flightNr} does not exist`);
        }
        return assetJSON.toString();
    }

    // UpdateAsset updates an existing asset in the world state with provided parameters.
    /*async UpdateAsset(ctx, flightNr, color, size, owner, appraisedValue) {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }

        // overwriting original asset with new asset
        const updatedAsset = {
            ID: id,
            Color: color,
            Size: size,
            Owner: owner,
            AppraisedValue: appraisedValue,
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        return ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(updatedAsset))));
    }*/

    // DeleteAsset deletes an given asset from the world state.
    /*async DeleteAsset(ctx, id) {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return ctx.stub.deleteState(id);
    }*/

    // AssetExists returns true when asset with given ID exists in world state.
    async FlightExists(ctx, flightNr) {
        const assetJSON = await ctx.stub.getState(flightNr);
        return assetJSON && assetJSON.length > 0;
    }

    // TransferAsset updates the owner field of asset with given id in the world state.
    /*async TransferAsset(ctx, flightNr, newOwner) {
        const assetString = await this.ReadAsset(ctx, id);
        const asset = JSON.parse(assetString);
        const oldOwner = asset.Owner;
        asset.Owner = newOwner;
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        return oldOwner;
    }*/

    // GetAllAssets returns all assets found in the world state.
    async GetAllFlights(ctx) {
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
}

module.exports = AssetTransfer;
