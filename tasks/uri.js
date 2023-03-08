const { task } =  require("hardhat/config");

const br = "\x1b[1m";
const fc = "\x1b[35m";
const bg = "\x1b[46m";
const r = "\x1b[0m";

task(`uri`, `${bg}${fc}${br}Deploys the default URI builder for OtoCo Entities${r}`)
.addParam("master", "The current instance of OtoCoMasterV2")
.setAction(async (taskArgs) => {

  entityURI = await (await ethers.getContractFactory("OtoCoURI")).deploy(taskArgs.master);
  await entityURI.deployTransaction.wait(1);
  const uri = await entityURI.deployed();
  const masterInstance = (await ethers.getContractFactory("OtoCoMasterV2")).attach(taskArgs.master);
  const change = await masterInstance.changeURISources(uri.address);
  await change.wait(1);

  return [uri, masterInstance];
});

