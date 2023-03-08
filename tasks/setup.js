const { task } = require("hardhat/config");
require('dotenv').config();

require("./utils/accounts");
require("./utils/verification");
require("./utils/gas");
require("./jurisdictions");
require("./master");
require("./uri");

const br = "\x1b[1m";
const fc = "\x1b[31m";
const bg = "\x1b[47m";
const r = "\x1b[0m";

const urlBuild = 
  `https://eth-` +
  `${process.env.FORKED_NETWORK}` + 
  `.g.alchemy.com/v2/` + 
  `${process.env.ALCHEMY_KEY}`;

const jurisdictionPrices = { 
  up: process.env.UNINCORPORATED_PRICES, 
  dp: process.env.DELAWARE_PRICES,
  wp: process.env.WYOMING_PRICES,
};


task(`setup`, `${bg}${fc}${br}OtoCo V2 scripts setup pusher${r}`)
  .setAction(async (undefined, hre) => {

  if(process.env.FORK_ENABLED != "false") {
    await network.provider.request({
      method: "hardhat_reset",
      params: [{ forking: { jsonRpcUrl: urlBuild } }],
    });
  };
    
    const jurisdictions = await hre.run( "jurisdictions", jurisdictionPrices );
    const jurAddrs = JSON.stringify(jurisdictions.map(({ address }) => address));
    const [master, priceFeedAdr] = await hre.run( "master", {jurisdictions: jurAddrs });
    const uri = (await hre.run("uri", {master: master.address}))[0];
    
  });

  module.exports = {
    solidity: "0.8.4",
  };