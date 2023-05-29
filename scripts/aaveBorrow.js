// Objective:
// 1. Import getWeth function (which turns ETH into WETH)
// 2. Deposit in Aave

const { getNamedAccounts } = require("hardhat");
const { getWeth, AMOUNT } = require("./getWeth.js");

async function main() {
  await getWeth();

  // To deposit in Aave (need abi, contract address)
  const { deployer } = await getNamedAccounts();
  const lendingPool = await getLendingPool(deployer); // lending pool contract address
  console.log(`Lending Pool address: ${lendingPool.address}`);

  // Depositing steps now
  // Approve
  const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer); // giving lending pool the approval to use our weth token
  console.log("Depositing....");
  // Depositing (check deposit function in https://github.com/aave/protocol-v2/blob/master/contracts/protocol/lendingpool/LendingPool.sol or https://docs.aave.com/developers/v/2.0/the-core-protocol/lendingpool)
  await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0);
  console.log("Deposited");

  // Borrowing steps now (How much we have in collateral, how much we have borrowed, how much we can borrow)
  let { totalCollateralETH, totalDebtEth, availableBorrowsETH } = await getBorrowUserData(
    lendingPool,
    deployer
  );

  // availableBorrowsETH: What the conversion rate of DAI is?
}

// Lending pool needs to be fetched from Lending pool address provider. Lending pool address provider: 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
async function getLendingPool(account) {
  // need abi and contract Address to interact
  const lendingPoolAddressesProvider = await ethers.getContractAt(
    "ILendingPoolAddressesProvider", // downloaded from npm already
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

async function approveErc20(
  erc20Address,
  spenderAddress,
  amountToSpend,
  account
) {
  const erc20Token = await ethers.getContractAt(
    "IERC20" /* abi */,
    erc20Address /* contractAddress */,
    account
  );
  const tx = await erc20Token.approve(spenderAddress, amountToSpend);
  await tx.wait(1);
  console.log("Approved");
}

async function getBorrowUserData(lendingPool, account) {
  const { totalCollateralETH, totalDebtEth, availableBorrowsETH } =
    await lendingPool.getUserAccountData(account);
  console.log(`You have ${totalCollateralETH} worth of ETH deposited`);
  console.log(`You have ${totalDebtEth} worth of ETH borrowed`);
  console.log(`You can borrow ${availableBorrowsETH} worth of ETH`);
  return { totalCollateralETH, totalDebtEth, availableBorrowsETH };
} // Source: https://docs.aave.com/developers/v/2.0/the-core-protocol/lendingpool#getuseraccountdata

async function getDaiPrice(){}

// boiler code for scripts
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
