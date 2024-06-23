// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
// v2.359.0

abstract contract Constants {
    uint public constant SECONDS_IN_DAY = 3_600 * 24;
    uint public constant DAYS_IN_YEAR = 365;
    uint public constant GENESIS_RANK = 1;
    uint public constant MIN_TERM = 1 * SECONDS_IN_DAY - 1;
    uint public constant MAX_TERM_START = 10 * SECONDS_IN_DAY; // 1 day
    uint public constant MAX_TERM_END = 10 * SECONDS_IN_DAY; // 1 day
    uint public constant TERM_AMPLIFIER = 1;
    uint public constant TERM_AMPLIFIER_THRESHOLD = 1;
    uint public constant REWARD_AMPLIFIER_START = 5;
    uint public constant REWARD_AMPLIFIER_END = 5;
    uint public constant EAA_PM_START = 1;
    uint public constant EAA_PM_STEP = 0;
    uint public constant EAA_RANK_STEP = 1;
    uint public constant WITHDRAWAL_WINDOW_DAYS = 7;
    uint public constant MAX_PENALTY_PCT = 90;
    uint public constant XEX_MIN_STAKE = 0;
    uint public constant XEX_MIN_BURN = 0;
    uint public constant XEX_APY_START = 20;
    uint public constant XEX_APY_DAYS_STEP = 0;
    uint public constant XEX_APY_END = 20;
    string public constant AUTHORS_XEN = "@MrJackLevin @lbelyaev faircrypto.org";

    uint public XEX_APR = 20 ether;
}
