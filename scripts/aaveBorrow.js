// Objective:
// 1. Import getWeth function (which turns ETH into WETH)
// 2. Deposit in Aave

const { getNamedAccounts } = require("hardhat");
const { getWeth } = require("./getWeth.js");

async function main() {
  await getWeth();

  // Depositing in Aave (need abi, contract address)
  const { deployer } = await getNamedAccounts();
  const lendingPool = await getLendingPool(deployer);   // lending pool contract address
  console.log(`Lending Pool address: ${lendingPool.address}`);  
}

// Lending pool needs to be fetched from Lending pool address provider. Lending pool address provider: 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
async function getLendingPool(account) {
  // need abi and contract Address to interact
  const lendingPoolAddressesProvider = await ethers.getContractAt(
    "ILendingPoolAddressesProvider",    // downloaded from npm already
    "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
    account // connecting to deployer
  );
  const lendingPoolAddress =
    await lendingPoolAddressesProvider.getLendingPool();

  const lendingPool = await ethers.getContractAt(
    "ILendingPool",
    lendingPoolAddress,
    account
  );
  return lendingPool;
}

// boiler code for scripts
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
