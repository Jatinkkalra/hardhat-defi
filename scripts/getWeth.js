// Objective:
// - Depositing ETH in Weth contract

const { getNamedAccounts } = require("hardhat");

const AMOUNT = ethers.utils.parseEther("0.02");

async function getWeth() {
  const { deployer } = await getNamedAccounts(); // will need an account to interact with contracts
  /* call deposit function on Weth contract. For that we will need: abi ✅, contractAddress ✅: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 */
  const iWeth = await ethers.getContractAt(
    "IWeth", //abi
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // ContractAddress
    deployer
  );
  const tx = await iWeth.deposit({ value: AMOUNT }); // Depositing ETH to Weth contract
  await tx.wait(1); // Wait
  const WethBalance = await iWeth.balanceOf(deployer); // Get Balance of Weth
  console.log(`Got ${WethBalance.toString()} Weth`);
}

module.exports = { getWeth, AMOUNT };

// No main() boiler code at the end as getWeth is being created just as a module, and being imported in ".aaveBorrow.js"
