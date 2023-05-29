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

  // Borrowing steps now
  // How much we have in collateral, how much we have borrowed, how much we can borrow
  let { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
    await getBorrowUserData(lendingPool, deployer);

  // availableBorrowsETH: What the conversion rate of DAI is?
  const daiPrice = await getDaiPrice();
  // How much we can borrow in DAI?
  const amountDaiToBorrow =
    availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber()); // 0.95 as we don't want to hit the maximum borrow limit
  console.log(`You can borrow ${amountDaiToBorrow} DAI`);
  // How much we can borrow in DAI? (in 18 decimal places)
  const amountDaiToBorrowWei = ethers.utils.parseEther(
    amountDaiToBorrow.toString()
  );

  // Borrowing
  const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"; // Source: https://etherscan.io/token/0x6b175474e89094c44da98b954eedeac495271d0f
  await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer);

  // Running the user statistics function again
  await getBorrowUserData(lendingPool, deployer);

  // Repaying steps now
  await repay(amountDaiToBorrowWei, daiTokenAddress, lendingPool, deployer);

  // Running the user statistics function again
  await getBorrowUserData(lendingPool, deployer);
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
  const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
    await lendingPool.getUserAccountData(account);
  console.log(`You have ${totalCollateralETH} worth of ETH deposited`);
  console.log(`You have ${totalDebtETH} worth of ETH borrowed`);
  console.log(`You can borrow ${availableBorrowsETH} worth of ETH`);
  return { totalCollateralETH, totalDebtETH, availableBorrowsETH };
} // Source: https://docs.aave.com/developers/v/2.0/the-core-protocol/lendingpool#getuseraccountdata

async function getDaiPrice() {
  const daiEthPriceFeed = await ethers.getContractAt(
    "AggregatorV3Interface", // abi
    "0x773616E4d11A78F511299002da57A0a94577F1f4" // DAI/ETH contract address: https://docs.chain.link/data-feeds/price-feeds/addresses
    // No need assign signer as we will only be reading the price
  );

  const price = (await daiEthPriceFeed.latestRoundData())[1]; // function from AggregatorV3Interface.sol
  console.log(`The DAI/ETH price is ${price.toString()} USD`);
  return price;
}

async function borrowDai(daiAddress, lendingPool, amountDaiToBorrow, account) {
  const borrowTx = await lendingPool.borrow(
    daiAddress,
    amountDaiToBorrow,
    1,
    0,
    account
  ); // Source: https://docs.aave.com/developers/v/2.0/the-core-protocol/lendingpool#borrow
  await borrowTx.wait(1);
  console.log(`You have borrowed!`);
}

async function repay(amount, daiAddress, lendingPool, account) {
  // daiAddress is the address we are going to repay to
  // To repay, we will first have to approve sending our DAI back to Aave
  await approveErc20(daiAddress, lendingPool.address, amount, account);
  // Repaying now
  const repayTx = await lendingPool.repay(daiAddress, amount, 1, account); // Source: https://docs.aave.com/developers/v/2.0/the-core-protocol/lendingpool#repay
  await repayTx.wait(1);
  console.log("Repaid!");
}

// boiler code for scripts
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
