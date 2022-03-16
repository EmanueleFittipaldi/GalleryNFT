hashCode = function(s){
  return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);              
}

var adminAccount;
var LAST_TOKENID = 'LAST_TOKENID_MINTED'; 
App = {
  web3Provider: null,
  contracts: {},

  init: async function() {

    $.getJSON('../allartwork.json', data => {
      var artworkRow = $('#artRow');
      var artworkTemplate = $('#artTemplate');
      for(i = 0; i < data.length; i++) {
        artworkTemplate.find('.panel-title').text(data[i].title);
        artworkTemplate.find('img').attr('src', data[i].image);
        artworkTemplate.find('.art-author').text(data[i].author);
        var measures = data[i].measures.width + 'x' + data[i].measures.heigth + 'cm';
        artworkTemplate.find('.art-measures').text(measures);
        artworkTemplate.find('.art-type').text(data[i].type);
        artworkTemplate.find('.art-own').text('-').attr('data-id', 'ARTOWNER-'+hashCode(data[i].URI));
        artworkTemplate.find('.btn-own').attr('data-id', hashCode(data[i].URI));
        artworkRow.append(artworkTemplate.html());
      }
      
    });
    return await App.initWeb3();
  },

  initWeb3: async function() {
    // Modern dapp browsers...
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        // Request account access
        await window.ethereum.enable();
      } catch (error) {
      // User denied account access...
      console.error("User denied account access")
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    }
    // If no injected web3 instance is detected, fall back to Ganache
    else {
      App.web3Provider = new Web3.providers.HttpProvider('http://127.0.0.1:7545');
    }
    web3 = new Web3(App.web3Provider);

    return App.initContract();
  },

  initContract: function() {

    

   $.getJSON('NFTArt.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract.
      var NTFArtArtifact = data;
      App.contracts.NFTArt = TruffleContract(NTFArtArtifact);
      // Set the provider for our contract.
      App.contracts.NFTArt.setProvider(App.web3Provider);

      //transazione creazione contratto
      var hash = App.contracts.NFTArt._json.networks['5777'].transactionHash;
      
      web3.eth.getTransaction(hash, function(error, result) {
        if (error) {
          console.log(error);
        }
        adminAccount = result.from;
      });
      
      window.ethereum.on('accountsChanged', function (accounts) {
        console.log(accounts);
        if (accounts[0] === adminAccount) 
          App.transferArtwork();
      })
      
      return App.markOwn();
    });

    return App.bindEvents();
  },

  markOwn: function() {

    $.getJSON('../allartwork.json', data => {
      var NFTArtInstance;
      App.contracts.NFTArt.deployed().then(async function(instance) {
       
      NFTArtInstance = instance;

        var j = window.localStorage.getItem(LAST_TOKENID);
        for (var i = 1; i <= j; i++) {
          await NFTArtInstance.existsTID(i).then(async result => {
            if (result == true) {
              var iURIHashed;
              await NFTArtInstance.tokenURI(i).then(result => {
                iURIHashed = hashCode(result);
                $('[data-id='+iURIHashed+']').text('OWNED').css('color','red').attr('disabled', true);
              });
              await NFTArtInstance.ownerOf(i).then(result => {
                var nickname = window.localStorage.getItem(result);
                $('[data-id=ARTOWNER-'+iURIHashed+']').text(nickname);
              });
            }
          });  
        }

          for(i = 0; i < data.length; i++) {
            tokenURI = data[i].URI;
            var address = window.localStorage.getItem(tokenURI);
            if (address != null) {
              $('[data-id='+hashCode(tokenURI)+']').text('RESERVED').css('color','green').attr('disabled', true);
            } 
          }
      });        
    });
  },

  bindEvents: function() {
     $(document).on('click', '.btn-own', App.handleTransfer);
  },

  handleTransfer: async function(event) {
    event.preventDefault();
    var jsonURIHashed = parseInt($(event.target).data('id'));
    var tokenURI;
    web3.eth.getAccounts(function(error, accounts) {
      if(error) {
        console.log(error);
      }
      var accountSelected = accounts[0];
      if (window.localStorage.getItem(accountSelected) == null) {
        var answer;
        while(true) {
          answer = window.prompt('Insert a nickname:');
          if (answer == '') {
            alert('Nickname cannot be empty!');
          } else 
            break;
        }
        window.localStorage.setItem(accountSelected, answer);
      }
      $.getJSON('../allartwork.json', data => {
        for(i = 0; i < data.length; i++) {
          var iURIHashed = hashCode(data[i].URI);
          if (jsonURIHashed === iURIHashed) {
            tokenURI = data[i].URI;
            if (accountSelected == adminAccount) {
              App.contracts.NFTArt.deployed().then(function(instance) {
                NFTArtInstance = instance;
                App.mintToken(NFTArtInstance, accountSelected, tokenURI);
             });
            }
            else {
              window.localStorage.setItem(tokenURI, accountSelected);
              $('[data-id='+iURIHashed+']').text('RESERVED').css('color','green').attr('disabled', true);
            }
            break;
          }
        }
      });
    });
    
  },

  transferArtwork: async function() {
    var NFTArtIstance, dataArtworks;
    await $.getJSON('../allartwork.json', data => {
      dataArtworks = data;
    });
    App.contracts.NFTArt.deployed().then(function(instance) {
      NFTArtInstance = instance;
      for(i = 0; i < dataArtworks.length; i++) {
          tokenURI = dataArtworks[i].URI;
          var address = window.localStorage.getItem(tokenURI);
          if (address != null) {
            App.mintToken(NFTArtInstance, address,tokenURI);
          }
    }
   });
  },

  mintToken: async function(NFTArtInstance, address, tokenURI) {
    await NFTArtInstance.mint(address, tokenURI, {from: adminAccount}).then(async result => {
      window.localStorage.setItem(LAST_TOKENID, result.logs[1].args._tokenId.c[0]);
      window.localStorage.removeItem(tokenURI);
      App.markOwn();
    }).catch(err => {
      console.log(err);
      window.localStorage.removeItem(tokenURI);
      App.markOwn();
    });
    
  }

};

$(function() {
  $(window).load(function() {
    App.init();
  });
});