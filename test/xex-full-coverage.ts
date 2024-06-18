import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract, Signer } from "ethers";

describe("XEX Contract", function () {
  let XEX: ContractFactory;
  let xex: Contract;
  let owner: Signer;
  let addr1: Signer;
  let addr2: Signer;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const Math = await ethers.getContractFactory("Math");
    const math = await Math.deploy();
    await math.deployed();

    XEX = await ethers.getContractFactory("XEX", {
      libraries: {
        Math: math.address,
      },
    });
    xex = await XEX.deploy();
    await xex.deployed();
  });

  it("Should deploy with correct initial values", async function () {
    expect(await xex.name()).to.equal("XEX");
    expect(await xex.symbol()).to.equal("XEX");
    expect(await xex.genesisTs()).to.be.a("number");
  });

  it("Should claim rank", async function () {
    await xex.connect(addr1).claimRank(10);
    const mintInfo = await xex.getUserMint(await addr1.getAddress());
    expect(mintInfo.rank).to.equal(1);
  });

  it("Should claim mint reward", async function () {
    await xex.connect(addr1).claimRank(1);
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine", []);
    await xex.connect(addr1).claimMintReward();
    const balance = await xex.balanceOf(await addr1.getAddress());
    expect(balance).to.be.gt(0);
  });

  it("Should stake tokens", async function () {
    await xex.connect(addr1).claimRank(1);
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine", []);
    await xex.connect(addr1).claimMintReward();
    const balance = await xex.balanceOf(await addr1.getAddress());
    await xex.connect(addr1).stake(balance, 10);
    const stakeInfo = await xex.getUserStake(await addr1.getAddress());
    expect(stakeInfo.amount).to.equal(balance);
  });

  it("Should withdraw staked tokens", async function () {
    await xex.connect(addr1).claimRank(1);
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine", []);
    await xex.connect(addr1).claimMintReward();
    const balance = await xex.balanceOf(await addr1.getAddress());
    await xex.connect(addr1).stake(balance, 1);
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine", []);
    await xex.connect(addr1).withdraw();
    const finalBalance = await xex.balanceOf(await addr1.getAddress());
    expect(finalBalance).to.be.gt(balance);
  });

  it("Should calculate max term", async function () {
    const maxTerm = await xex.calculateMaxTerm();
    expect(maxTerm).to.be.a("number");
  });

  it("Should calculate penalty", async function () {
    const penalty = await xex.penalty(86400); // 1 day late
    expect(penalty).to.be.a("number");
  });

  it("Should calculate mint reward", async function () {
    await xex.connect(addr1).claimRank(1);
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine", []);
    const mintInfo = await xex.getUserMint(await addr1.getAddress());
    const reward = await xex.calculateMintReward(
      mintInfo.rank,
      mintInfo.term,
      mintInfo.maturityTs,
      mintInfo.amplifier,
      mintInfo.eaaRate
    );
    expect(reward).to.be.a("number");
  });

  it("Should calculate reward amplifier", async function () {
    const amplifier = await xex.calculateRewardAmplifier();
    expect(amplifier).to.be.a("number");
  });

  it("Should calculate EAA rate", async function () {
    const eaaRate = await xex.calculateEAARate();
    expect(eaaRate).to.be.a("number");
  });

  it("Should calculate APY", async function () {
    const apy = await xex.calculateAPY();
    expect(apy).to.be.a("number");
  });

  it("Should get gross reward", async function () {
    const reward = await xex.getGrossReward(10, 5, 10, 1000);
    expect(reward).to.be.a("number");
  });

  it("Should get user mint info", async function () {
    await xex.connect(addr1).claimRank(10);
    const mintInfo = await xex.getUserMint(await addr1.getAddress());
    expect(mintInfo.rank).to.equal(1);
  });

  it("Should get user stake info", async function () {
    await xex.connect(addr1).claimRank(1);
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine", []);
    await xex.connect(addr1).claimMintReward();
    const balance = await xex.balanceOf(await addr1.getAddress());
    await xex.connect(addr1).stake(balance, 10);
    const stakeInfo = await xex.getUserStake(await addr1.getAddress());
    expect(stakeInfo.amount).to.equal(balance);
  });

  it("Should get current AMP", async function () {
    const amp = await xex.getCurrentAMP();
    expect(amp).to.be.a("number");
  });

  it("Should get current EAA rate", async function () {
    const eaaRate = await xex.getCurrentEAAR();
    expect(eaaRate).to.be.a("number");
  });

  it("Should get current max term", async function () {
    const maxTerm = await xex.getCurrentMaxTerm();
    expect(maxTerm).to.be.a("number");
  });

  it("Should create minter", async function () {
    await xex.connect(addr1).minter_create(1, 10);
    const minters = await xex.mintersOf(await addr1.getAddress());
    expect(minters.length).to.equal(1);
  });

  it("Should get minter info", async function () {
    await xex.connect(addr1).minter_create(1, 10);
    const minterInfo = await xex.minterInfoOf(await addr1.getAddress());
    expect(minterInfo.length).to.equal(1);
  });

  it("Should claim minter rank", async function () {
    await xex.connect(addr1).minter_create(1, 10);
    await xex.connect(addr1).minter_claimRank(1);
    const minterInfo = await xex.minterInfoOf(await addr1.getAddress());
    expect(minterInfo[0].rank).to.be.gt(0);
  });

  it("Should claim minter mint reward", async function () {
    await xex.connect(addr1).minter_create(1, 1);
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine", []);
    await xex.connect(addr1).minter_claimMintReward(1, await addr1.getAddress());
    const balance = await xex.balanceOf(await addr1.getAddress());
    expect(balance).to.be.gt(0);
  });

  it("Should get minter mint reward", async function () {
    await xex.connect(addr1).minter_create(1, 1);
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine", []);
    const rewards = await xex.minter_getMintReward(await addr1.getAddress());
    expect(rewards.length).to.equal(1);
  });

  it("Should calculate stake reward", async function () {
    await xex.connect(addr1).claimRank(1);
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine", []);
    await xex.connect(addr1).claimMintReward();
    const balance = await xex.balanceOf(await addr1.getAddress());
    await xex.connect(addr1).stake(balance, 1);
    const reward = await xex.calculateStakeReward(await addr1.getAddress());
    expect(reward).to.be.a("number");
  });

  it("Should get stake reward", async function () {
    await xex.connect(addr1).claimRank(1);
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine", []);
    await xex.connect(addr1).claimMintReward();
    const balance = await xex.balanceOf(await addr1.getAddress());
    await xex.connect(addr1).stake(balance, 1);
    const reward = await xex.stakeRewardOf(await addr1.getAddress());
    expect(reward).to.be.a("number");
  });
});
