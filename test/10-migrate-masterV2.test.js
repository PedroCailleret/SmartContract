const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { solidity } = require("ethereum-waffle");
const chai = require("chai");
const { zeroAddress } = require("ethereumjs-util");
const { ConsensusAlgorithm } = require("@ethereumjs/common");
chai.use(solidity);

const EthDividend = ethers.BigNumber.from(ethers.utils.parseUnits('1', 18)).mul(ethers.utils.parseUnits('1', 9)).div(10);

describe("OtoCo Master Test", function () {

  let owner, wallet2, wallet3, wallet4;
  let OtoCoMaster;
  let otocoMaster;
  let jurisdictions;
  let priceFeed;

  it("Create Jurisdictions", async function () {

    [owner, wallet2, wallet3, wallet4] = await ethers.getSigners();

    const Unincorporated = await ethers.getContractFactory("JurisdictionUnincorporatedV2");
    const Delaware = await ethers.getContractFactory("JurisdictionDelawareV2");
    const Wyoming = await ethers.getContractFactory("JurisdictionWyomingV2");
    
    const unincorporated = await Unincorporated.deploy(0, 2, 'DAO', 'defaultBadgeURL', 'goldBadgeURL');
    const delaware = await Delaware.deploy(5, 5, 'DELAWARE', 'defaultBadgeURLDE', 'goldBadgeURLDE');
    const wyoming = await Wyoming.deploy(50, 40, 'WYOMING', 'defaultBadgeURLWY', 'goldBadgeURLWY');
    
    jurisdictions = [unincorporated.address, delaware.address, wyoming.address];
  });

  it("Initialize Master and add jurisdictions", async function () {
    const [owner, wallet2, wallet3, wallet4] = await ethers.getSigners();

    OtoCoMaster = await ethers.getContractFactory("OtoCoMaster");
    otocoMaster = await upgrades.deployProxy(OtoCoMaster, [jurisdictions, 'https://otoco.io/dashpanel/entity/']);
    await otocoMaster.deployed();

    expect(await otocoMaster.name()).to.equal("OtoCo Series");
    expect(await otocoMaster.symbol()).to.equal("OTOCO");
    expect(await otocoMaster.owner()).to.equal(owner.address);
  });

  it("Check jurisdiction order and count", async function () {

    const unincorporated = await ethers.getContractAt("OtoCoJurisdiction", await otocoMaster.jurisdictionAddress(0));
    const delaware = await ethers.getContractAt("OtoCoJurisdiction", await otocoMaster.jurisdictionAddress(1));
    const wyoming = await ethers.getContractAt("OtoCoJurisdiction", await otocoMaster.jurisdictionAddress(2));

    expect(await otocoMaster.jurisdictionCount()).to.equal(3);

    expect(await unincorporated.getJurisdictionName()).to.equal("DAO");
    expect(await delaware.getJurisdictionName()).to.equal("DELAWARE");
    expect(await wyoming.getJurisdictionName()).to.equal("WYOMING");

  });

  it("Test migration of previous entities", async function () {

    const jurisdictions = [0,1,2];
    const controllers = [wallet2.address, wallet3.address, wallet4.address];
    const creations = [10000, 20000, 30000];
    const names = ['Entity 1', 'Entity 2 LLC', 'Entity 3 - Series 1'];

    await otocoMaster.createBatchSeries(jurisdictions, controllers, creations, names);

    expect((await otocoMaster.seriesCount()).toNumber()).to.equal(3);

    const firstSeries = await otocoMaster.series(0);
    expect(firstSeries[0]).to.equal(0);
    expect(firstSeries[2].toNumber()).to.equal(10000);
    expect(firstSeries[3]).to.equal("Entity 1");

    const secondSeries = await otocoMaster.series(1);
    expect(secondSeries[0]).to.equal(1);
    expect(secondSeries[2].toNumber()).to.equal(20000);
    expect(secondSeries[3]).to.equal("Entity 2 LLC");

  });

  it("Test migration entities", async function () {

    const jurisdictions = [2,2,2,1];
    const controllers = [wallet2.address, wallet3.address, wallet4.address, zeroAddress()];
    const creations = [10000, 20000, 30000, 40000];
    const names = ['Entity 1 - Series 2', 'Entity 2 - Series 3', 'Entity 3 - Series 4', 'Closed LLC'];

    await otocoMaster.createBatchSeries(jurisdictions, controllers, creations, names);

    expect((await otocoMaster.seriesCount()).toNumber()).to.equal(7);

    const firstSeries = await otocoMaster.series(3);
    expect(firstSeries[0]).to.equal(2);
    expect(firstSeries[2].toNumber()).to.equal(10000);
    expect(firstSeries[3]).to.equal("Entity 1 - Series 2");

    const secondSeries = await otocoMaster.series(4);
    expect(secondSeries[0]).to.equal(2);
    expect(secondSeries[2].toNumber()).to.equal(20000);
    expect(secondSeries[3]).to.equal("Entity 2 - Series 3");

  });

  it("Update Master contract to V2", async function () {

    const OtoCoMasterV2 = await ethers.getContractFactory("OtoCoMasterV2");
    otocoMaster = await upgrades.upgradeProxy(otocoMaster.address, OtoCoMasterV2);
    await otocoMaster.deployed();

    expect(await otocoMaster.name()).to.equal("OtoCo Series");
    expect(await otocoMaster.symbol()).to.equal("OTOCO");
    expect(await otocoMaster.owner()).to.equal(owner.address);
  });

  it("Change payment fees and price feed source", async function () {
    const otocoBaseFee = await otocoMaster.baseFee();
    expect(await otocoMaster.changeBaseFees("5000000000000000"))
    .to.emit(otocoMaster, "BaseFeeChanged")
    .withArgs("5000000000000000");
    expect(await otocoMaster.baseFee()).to.be.equal("5000000000000000");
    const PriceFeed = await ethers.getContractFactory("MockAggregatorV3");
    priceFeed = await PriceFeed.deploy();
    expect(await otocoMaster.changePriceFeed(priceFeed.address)).to.emit(otocoMaster, "UpdatedPriceFeed");
  })

  it("Creating series with correct fees and wrong fees", async function () {

    const gasPrice = ethers.BigNumber.from("2000000000");
    const gasLimit = ethers.BigNumber.from("200000");
    // Check the amount of ETH has to be paid after pass the priceFeed
    const Wyoming = await ethers.getContractFactory("JurisdictionWyomingV2");
    const Unincorporated = await ethers.getContractFactory("JurisdictionUnincorporatedV2");
    const Delaware = await ethers.getContractFactory("JurisdictionDelawareV2");
    const wy = Wyoming.attach(await otocoMaster.jurisdictionAddress(2));
    const de = Delaware.attach(await otocoMaster.jurisdictionAddress(1));
    const unc = Unincorporated.attach(await otocoMaster.jurisdictionAddress(0));
    const amountToPayForSpinUp = EthDividend.div((await priceFeed.latestRoundData()).answer).mul(await wy.getJurisdictionDeployPrice());
    const amountToPayForSpinUp2 = EthDividend.div((await priceFeed.latestRoundData()).answer).mul(await de.getJurisdictionDeployPrice());
    const amountToPayForSpinUp3 = EthDividend.div((await priceFeed.latestRoundData()).answer).mul(await unc.getJurisdictionDeployPrice());
    const totalFeePaid = amountToPayForSpinUp.add(amountToPayForSpinUp2.add(amountToPayForSpinUp3));
    // console.log(await otocoMaster.jurisdictionAddress(2), "\n", await otocoMaster.jurisdictionAddress(1), "\n", await otocoMaster.jurisdictionAddress(0), "\n")
    // Remove 1% from the correct amount needed
    const notEnoughToPayForSpinUp = amountToPayForSpinUp.mul(100).div(101);

    // Try to create without the proper amount of ETH Value, expect to fail
    await expect(otocoMaster.createSeries(2, owner.address, "New Entity", {gasPrice, gasLimit, value:notEnoughToPayForSpinUp}))
    .to.be.revertedWithCustomError(otocoMaster, "InsufficientValue");

    const previousBalance = await ethers.provider.getBalance(otocoMaster.address);

    // Expected to successfully create a new entity
    const transaction = await otocoMaster.createSeries(2, owner.address, "New Entity", {gasPrice, gasLimit, value:amountToPayForSpinUp});
    const transaction2 = await otocoMaster.createSeries(1, owner.address, "New Entity 2", {gasPrice, gasLimit, value:amountToPayForSpinUp2});
    const transaction3 = await otocoMaster.createSeries(0, owner.address, "New Entity 3", {gasPrice, gasLimit, value:amountToPayForSpinUp3});
    await expect(transaction).to.emit(otocoMaster, 'Transfer').withArgs(zeroAddress(), owner.address, 7);
    await expect(transaction2).to.emit(otocoMaster, 'Transfer').withArgs(zeroAddress(), owner.address, 8);
    await expect(transaction3).to.emit(otocoMaster, 'Transfer').withArgs(zeroAddress(), owner.address, 9);
    expect((await otocoMaster.series(7)).jurisdiction).to.be.equal(2);
    expect((await otocoMaster.series(8)).jurisdiction).to.be.equal(1);
    expect((await otocoMaster.series(9)).jurisdiction).to.be.equal(0);
    expect((await otocoMaster.series(7)).name).to.be.equal("New Entity - Series 5");
    expect((await otocoMaster.series(8)).name).to.be.equal("New Entity 2 LLC");
    expect((await otocoMaster.series(9)).name).to.be.equal("New Entity 3");
    
    // Check if the amount to pay was transferred
    expect(await ethers.provider.getBalance(otocoMaster.address)).to.be.equal(previousBalance.add(totalFeePaid));

  });

  it("Closing series with correct fees and wrong fees", async function () {

    const gasPrice = ethers.BigNumber.from("2000000000");
    const gasLimit = ethers.BigNumber.from("60000");
    const otocoBaseFee = await otocoMaster.baseFee();

    // 34750 reduction from gas limit is what is spended before check happens
    const amountToPayForClose = ethers.BigNumber.from(gasLimit).sub(30000).mul(otocoBaseFee);
    // Remove 1% from the correct amount needed
    const notEnoughToPayForClose = amountToPayForClose.mul(100).div(110);

    await expect(otocoMaster.closeSeries(7, {gasPrice, gasLimit, value:notEnoughToPayForClose}))
    .to.be.revertedWithCustomError(otocoMaster, "InsufficientValue")

    await expect(otocoMaster.connect(wallet2).closeSeries(7, {gasPrice, gasLimit, value:amountToPayForClose}))
    .to.be.revertedWithCustomError(otocoMaster, 'IncorrectOwner');

    // Close the company
    const transactionClose = await otocoMaster.closeSeries(7, {gasPrice, gasLimit, value:amountToPayForClose});
    await expect(transactionClose).to.emit(otocoMaster, 'Transfer').withArgs(owner.address, zeroAddress(), 7);

    await expect(otocoMaster.ownerOf(6)).to.be.reverted;

  });

  it("Should withdraw fees", async function () {

    // Try update with wrong wallet
    await expect(otocoMaster.connect(wallet2).withdrawFees())
    .to.be.revertedWith('Ownable: caller is not the owner');

    await otocoMaster.withdrawFees();
    
    // Chech if the amount to pay was transferred
    expect(await ethers.provider.getBalance(otocoMaster.address)).to.be.equal(0);

  });

  it("Update URI Sources and check if TokenURI are correct", async function () {

    const EntityURI = await ethers.getContractFactory("OtoCoURI");
    const entityURI = await EntityURI.deploy(otocoMaster.address);
    await entityURI.deployed();
    expect(await otocoMaster.changeURISources(entityURI.address))
    .to.emit(otocoMaster, "ChangedURISource")
    .withArgs(entityURI.address)
    expect(await otocoMaster.entitiesURI()).to.be.equals(entityURI.address);

    const tokenURI = await otocoMaster.tokenURI(4);
    const tokenURI2 = await otocoMaster.tokenURI(7);

    // Decode base64 data to read JSON data
    let buff = Buffer.from(tokenURI.split(',')[1], 'base64');
    let json = JSON.parse(buff.toString('utf-8'));
    
    expect(json.name).to.be.equal("Entity 2 - Series 3");
    expect(json.image).to.be.equal("goldBadgeURLWY");

    // Decode base64 data to read JSON data
    buff = Buffer.from(tokenURI2.split(',')[1], 'base64');
    json = JSON.parse(buff.toString('utf-8'));
    
    expect(json.name).to.be.equal("New Entity - Series 5");
    expect(json.image).to.be.equal("defaultBadgeURLWY");
    expect(json.attributes[0].trait_type).to.be.equal("Creation");
    expect(parseInt(json.attributes[0].value)).to.be.above(Date.now()*0.0001-5000);
    expect(json.attributes[1].trait_type).to.be.equal("Jurisdiction");
    expect(json.attributes[1].value).to.be.equals("WYOMING");
    // console.log(json)
  });

});