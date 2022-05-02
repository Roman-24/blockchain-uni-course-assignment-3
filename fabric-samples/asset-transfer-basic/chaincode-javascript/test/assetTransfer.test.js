/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
*/

'use strict';
const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;

const { Context } = require('fabric-contract-api');
const { ChaincodeStub, ClientIdentity } = require('fabric-shim');

const AssetTransfer = require('../lib/assetTransfer.js');

let assert = sinon.assert;
chai.use(sinonChai);

describe('Asset Transfer Basic Tests - flight tests for ORG1', () => {
    let transactionContext, chaincodeStub, asset, clientIdentity;
    beforeEach(() => {
        transactionContext = new Context();

        chaincodeStub = sinon.createStubInstance(ChaincodeStub);
        transactionContext.setChaincodeStub(chaincodeStub);

        clientIdentity = sinon.createStubInstance(ClientIdentity);
        clientIdentity.getMSPID.returns('Org1MSP');
        transactionContext.setClientIdentity(clientIdentity);

        chaincodeStub.putState.callsFake((key, value) => {
            if (!chaincodeStub.states) {
                chaincodeStub.states = {};
            }
            chaincodeStub.states[key] = value;
        });

        chaincodeStub.getState.callsFake(async (key) => {
            let ret;
            if (chaincodeStub.states) {
                ret = chaincodeStub.states[key];
            }
            return Promise.resolve(ret);
        });

        chaincodeStub.deleteState.callsFake(async (key) => {
            if (chaincodeStub.states) {
                delete chaincodeStub.states[key];
            }
            return Promise.resolve(key);
        });

        chaincodeStub.getStateByRange.callsFake(async () => {
            function* internalGetStateByRange() {
                if (chaincodeStub.states) {
                    // Shallow copy
                    const copied = Object.assign({}, chaincodeStub.states);

                    for (let key in copied) {
                        yield {value: copied[key]};
                    }
                }
            }

            return Promise.resolve(internalGetStateByRange());
        });

        asset = {
            flightNr: 'EC001',
            flyFrom: 'BUD',
            flyTo: 'TXL',
            dateTimeDeparture: '05032021-1034',
            availablePlaces: 100,
            reservations: {}
        };
    });

    describe('Test InitLedger', () => {
        it('should return error on InitLedger', async () => {
            chaincodeStub.putState.rejects('failed inserting key');
            let assetTransfer = new AssetTransfer();
            try {
                await assetTransfer.initLedger(transactionContext);
                assert.fail('InitLedger should have failed');
            } catch (err) {
                expect(err.name).to.equal('failed inserting key');
            }
        });

        it('should return success on InitLedger', async () => {
            let assetTransfer = new AssetTransfer();
            await assetTransfer.initLedger(transactionContext);
            let ret = JSON.parse((await chaincodeStub.getState('EC001')).toString());
            expect(ret).to.eql(Object.assign({docType: 'flight'}, asset));
        });
    });

    describe('Test createAsset - vytvorenie letu', () => {
        it('should return error on createAsset', async () => {
            chaincodeStub.putState.rejects('failed inserting key');

            let assetTransfer = new AssetTransfer();
            try {
                await assetTransfer.createAsset(transactionContext, asset.flightNr, asset.flyFrom, asset.flyTo, asset.dateTimeDeparture, asset.availablePlaces);
                assert.fail('createAsset should have failed');
            } catch(err) {
                expect(err.name).to.equal('failed inserting key');
            }
        });

        it('should return success on createAsset', async () => {
            let assetTransfer = new AssetTransfer();

            await assetTransfer.createAsset(transactionContext, asset.flyFrom, asset.flyTo, asset.dateTimeDeparture, asset.availablePlaces);

            let ret = JSON.parse((await chaincodeStub.getState(asset.flightNr)).toString());
            expect(ret).to.eql(asset);
        });
    });

    describe('Test ReadAsset - informacie o lete', () => {
        it('should return error on ReadAsset', async () => {
            let assetTransfer = new AssetTransfer();
            await assetTransfer.createAsset(transactionContext, asset.flyFrom, asset.flyTo, asset.dateTimeDeparture, asset.availablePlaces);

            try {
                await assetTransfer.readAsset(transactionContext, 'asset2');
                assert.fail('ReadAsset should have failed');
            } catch (err) {
                expect(err.message).to.equal('The asset asset2 does not exist');
            }
        });

        it('should return success on ReadAsset', async () => {
            let assetTransfer = new AssetTransfer();
            await assetTransfer.createAsset(transactionContext, asset.flyFrom, asset.flyTo, asset.dateTimeDeparture, asset.availablePlaces);

            let ret = JSON.parse(await chaincodeStub.getState(asset.flightNr));
            expect(ret).to.eql(asset);
        });
    });

    describe('Test UpdateAsset - menenie atributov letu', () => {
        it('should return error on UpdateAsset', async () => {
            let assetTransfer = new AssetTransfer();
            await assetTransfer.createAsset(transactionContext, asset.flyFrom, asset.flyTo, asset.dateTimeDeparture, asset.availablePlaces);

            try {
                await assetTransfer.updateAsset(transactionContext, 'EC099', 'oprava1', 'oprava2', '000000000', 500);
                assert.fail('UpdateAsset should have failed');
            } catch (err) {
                expect(err.message).to.equal('The asset EC099 does not exist');
            }
        });

        it('should return success on UpdateAsset', async () => {
            let assetTransfer = new AssetTransfer();
            await assetTransfer.createAsset(transactionContext, asset.flyFrom, asset.flyTo, asset.dateTimeDeparture, asset.availablePlaces);

            await assetTransfer.updateAsset(transactionContext, 'EC001', 'oprava1', 'oprava2', '000000000', 500);
            let ret = JSON.parse(await chaincodeStub.getState(asset.flightNr));
            let expected = {
                flightNr: 'EC001',
                flyFrom: 'oprava1',
                flyTo: 'oprava2',
                dateTimeDeparture: '000000000',
                availablePlaces: 500,
                reservations: {}
            };
            expect(ret).to.eql(expected);
        });
    });

    /*
    describe('Test GetAllAssets', () => {
        it('should return success on GetAllAssets for non JSON value', async () => {
            let assetTransfer = new AssetTransfer();

            await assetTransfer.createAsset(transactionContext, 'VIE', 'RTG', '000000000', 500);
            await assetTransfer.createAsset(transactionContext, 'BLA', 'RTG', '000000000', 200);
            await assetTransfer.createAsset(transactionContext, 'SCL', 'RTG', '000000000', 300);
            await assetTransfer.createAsset(transactionContext, 'GPC', 'RTG', '000000000', 400);

            let ret = await assetTransfer.GetAllAssets(transactionContext);
            ret = JSON.parse(ret);
            expect(ret.length).to.equal(4);

            let expected = [
                {Record: {flightNr: 'EC001', flyFrom: 'VIE', flyTo: 'RTG', dateTimeDeparture: '000000000', availablePlaces: 500, reservations: {}}},
                {Record: {flightNr: 'EC002', flyFrom: 'BLA', flyTo: 'RTG', dateTimeDeparture: '000000000', availablePlaces: 200, reservations: {}}},
                {Record: {flightNr: 'EC003', flyFrom: 'SCL', flyTo: 'RTG', dateTimeDeparture: '000000000', availablePlaces: 300, reservations: {}}},
                {Record: {flightNr: 'EC004', flyFrom: 'GPC', flyTo: 'RTG', dateTimeDeparture: '000000000', availablePlaces: 400, reservations: {}}},
            ];

            expect(ret).to.eql(expected);
        });

        it('should return success on GetAllAssets', async () => {
            let assetTransfer = new AssetTransfer();

            await assetTransfer.createAsset(transactionContext, 'VIE', 'RTG', '000000000', 500);
            await assetTransfer.createAsset(transactionContext, 'BLA', 'RTG', '000000000', 200);
            await assetTransfer.createAsset(transactionContext, 'SCL', 'RTG', '000000000', 300);
            await assetTransfer.createAsset(transactionContext, 'GPC', 'RTG', '000000000', 400);

            let ret = await assetTransfer.getAllAssets(transactionContext);
            ret = JSON.parse(ret);
            expect(ret.length).to.equal(4);

            let expected = [
                {Record: {flightNr: 'EC001', flyFrom: 'VIE', flyTo: 'RTG', dateTimeDeparture: '000000000', availablePlaces: 500, reservations: {}}},
                {Record: {flightNr: 'EC002', flyFrom: 'BLA', flyTo: 'RTG', dateTimeDeparture: '000000000', availablePlaces: 200, reservations: {}}},
                {Record: {flightNr: 'EC003', flyFrom: 'SCL', flyTo: 'RTG', dateTimeDeparture: '000000000', availablePlaces: 300, reservations: {}}},
                {Record: {flightNr: 'EC004', flyFrom: 'GPC', flyTo: 'RTG', dateTimeDeparture: '000000000', availablePlaces: 400, reservations: {}}},
            ];

            expect(ret).to.eql(expected);
        });
    });
    */
});
