// SPDX-License-Identifier: MIT

// Based on https://github.com/OpenZeppelin/openzeppelin-solidity/blob/v2.5.1/test/examples/SimpleToken.test.js

const {expect}  = require('chai');

var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'));

const { expectEvent, expectRevert, constants } = require('@openzeppelin/test-helpers');

const NFTArt = artifacts.require('NFTArt');

contract('NFTArt', function([account, other]) {

    beforeEach(async function() {
        this.token = await NFTArt.new({from:account});
    });

    it('check mint from minter', async function () {
        const metadata = "https://ipfs.io/ipfs/QmNvMuNGzSAVoLZaG87rbKmKSNiNUrrZ2b9fwNkceatttW"

        const receipt2 = await this.token.mint(account, metadata, { from: account });
        var tokenID = receipt2.logs[1].args[0];
        
        const address = await this.token.ownerOf(tokenID);
        expect(address).to.be.equal(account);
        
        const tokenURI = await this.token.tokenURI(tokenID); // Using the tokenURI from ERC721 to retrieve de metadata
        expect(tokenURI).to.be.equal(metadata);

    });
    
    

});