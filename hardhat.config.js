 require('@openzeppelin/hardhat-upgrades');
 require('solidity-coverage');
 require('solidity-docgen');
 
 const fs = require('fs');
 const apiMain = fs.readFileSync(".api.main").toString().trim();
 const apiRopsten = fs.readFileSync(".api.ropsten").toString().trim();
 const apiRinkeby = fs.readFileSync(".api.rinkeby").toString().trim();
 const seedMain = fs.readFileSync(".secret.main").toString().trim();
 
module.exports = {
  solidity: "0.8.3",
  networks: {
    hardhat: {
      blockGasLimit: 30000000,
      hardfork: 'london'
    },
    main: {
      url: apiMain,
      accounts: {
        mnemonic: seedMain,
        count: 1
      }
    },
    ropsten: {
      url: apiRopsten,
      accounts: {
        mnemonic: seedMain,
        count: 1
      }
    }
  }
};
