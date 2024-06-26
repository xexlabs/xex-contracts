# Game Contract Functions Documentation

This document describes the main functions of the Game contract, their inputs, outputs, and functionality.

## 1. start

**Description**: Initiates a new game session for a specific dungeon.

**Input**:
- `_dungeonId` (uint): The ID of the dungeon to start the game in.
- `operator` (address): The address allowed to operate on behalf of the user.

**Output**: Emits a `NewSession` event with the following parameters:
- `user` (address): The address of the user starting the session.
- `tokenId` (uint): The unique identifier for the game session.
- `feeDeposited` (uint): The amount of ETH deposited as a fee.
- `termDate` (uint): The timestamp when the session can be claimed.
- `rewardAmount` (uint): The initial reward amount (0 at start).
- `gameCompleted` (bool): Whether the game is completed (false at start).

**Functionality**:
- Checks if the dungeon is active and within its time bounds.
- Ensures the sent ETH meets the minimum mint fee.
- Calculates a random term date based on dungeon difficulty.
- Mints a new NFT representing the game session.
- Stores the session information and updates relevant mappings.

## 2. end

**Description**: Ends a game session, determining the outcome and potential rewards.

**Input**:
- `_tokenId` (uint): The ID of the game session to end.
- `completed` (bool): Whether the game was successfully completed.
- `ts` (uint): The timestamp of the end action.
- `_signature` (bytes): A signature to verify the end action (if required).

**Output**: Emits an `EndSession` event with the following parameters:
- `_tokenId` (uint): The ID of the ended game session.
- `claimAmount` (uint): The amount of XEX tokens that can be claimed.

**Functionality**:
- Verifies the caller is the session owner or operator.
- Checks if the game was completed within the allowed time.
- Calculates the claim amount based on completion status and time.
- Updates the session information and relevant mappings.

## 3. claim

**Description**: Allows a user to claim their rewards from a completed game session.

**Input**:
- `_tokenId` (uint): The ID of the game session to claim rewards from.

**Output**: Emits a `Claim` event with the following parameters:
- `_tokenId` (uint): The ID of the claimed game session.
- `claimAmount` (uint): The amount of XEX tokens claimed.

**Functionality**:
- Verifies the caller is the session owner or operator.
- Checks if the session is eligible for claiming (completed, not already claimed, past term date).
- Calculates the final claim amount, considering potential decay and bonuses.
- Mints XEX tokens to the user.
- Updates the dungeon's available and claimed rewards.
- Transfers the session NFT to the user.

## 4. getDungeonInfo

**Description**: Retrieves information about a specific dungeon.

**Input**:
- `_dungeonId` (uint): The ID of the dungeon to get information for.

**Output**: Returns a `Dungeon` struct with the following fields:
- `owner` (address): The owner of the dungeon.
- `name` (string): The name of the dungeon.
- `startIn` (uint): The timestamp when the dungeon becomes active.
- `endIn` (uint): The timestamp when the dungeon becomes inactive.
- `minTermDate` (uint): The minimum term date for game sessions.
- `maxTermDate` (uint): The maximum term date for game sessions.
- `minMintFee` (uint): The minimum fee required to start a game session.
- `difficulty` (uint): The difficulty level of the dungeon (1-100).
- `active` (bool): Whether the dungeon is currently active.
- `availableRewards` (uint): The amount of rewards available in the dungeon.
- `claimedRewards` (uint): The amount of rewards claimed from the dungeon.

## 5. getSessionInfo

**Description**: Retrieves information about a specific game session.

**Input**:
- `_tokenId` (uint): The ID of the game session to get information for.

**Output**: Returns a `Session` struct with the following fields:
- `user` (address): The address of the user who started the session.
- `tokenId` (uint): The unique identifier for the game session.
- `feeDeposited` (uint): The amount of ETH deposited as a fee.
- `rewardAmount` (uint): The potential reward amount.
- `gameCompleted` (bool): Whether the game has been completed.
- `dungeonId` (uint): The ID of the dungeon the session is in.
- `startedAt` (uint): The timestamp when the session started.
- `endedAt` (uint): The timestamp when the session ended (0 if not ended).
- `claimAmount` (uint): The amount of XEX tokens that can be claimed.
- `claimAt` (uint): The timestamp when the rewards were claimed (0 if not claimed).
- `termDate` (uint): The timestamp when the session can be claimed.
- `operator` (address): The address allowed to operate on behalf of the user.

## 6. getUserSessions

**Description**: Retrieves all active game sessions for a specific user.

**Input**:
- `_user` (address): The address of the user to get sessions for.

**Output**: Returns an array of `uint` values representing the token IDs of the user's active sessions.

## 7. getUserFinishedSessions

**Description**: Retrieves all finished game sessions for a specific user.

**Input**:
- `_user` (address): The address of the user to get finished sessions for.

**Output**: Returns an array of `uint` values representing the token IDs of the user's finished sessions.

## 8. getDungeonSessions

**Description**: Retrieves all active game sessions for a specific dungeon.

**Input**:
- `_dungeonId` (uint): The ID of the dungeon to get sessions for.

**Output**: Returns an array of `uint` values representing the token IDs of the active sessions in the dungeon.

## 9. getDungeonFinishedSessions

**Description**: Retrieves all finished game sessions for a specific dungeon.

**Input**:
- `_dungeonId` (uint): The ID of the dungeon to get finished sessions for.

**Output**: Returns an array of `uint` values representing the token IDs of the finished sessions in the dungeon.

## 10. getAllDungeons

**Description**: Retrieves all dungeon IDs.

**Input**: None

**Output**: Returns an array of `uint` values representing all dungeon IDs.

## 11. getAllActiveDungeons

**Description**: Retrieves all active dungeon IDs.

**Input**: None

**Output**: Returns an array of `uint` values representing the IDs of all active dungeons.

## 12. dungeonsOf

**Description**: Retrieves all dungeon IDs owned by a specific user.

**Input**:
- `_user` (address): The address of the user to get owned dungeons for.

**Output**: Returns an array of `uint` values representing the IDs of dungeons owned by the user.

## 13. addDungeon

**Description**: Adds a new dungeon to the game.

**Input**:
- `_name` (string): The name of the dungeon.
- `_startIn` (uint): The start time of the dungeon.
- `_endIn` (uint): The end time of the dungeon.
- `_minTermDate` (uint): The minimum term date for the dungeon.
- `_maxTermDate` (uint): The maximum term date for the dungeon.
- `_minMintFee` (uint): The minimum mint fee required to start a session in the dungeon.
- `_difficulty` (uint): The difficulty level of the dungeon.
- `_availableRewards` (uint): The total rewards available in the dungeon.

**Output**: Emits a `DungeonAdded` event with the following parameters:
- `dungeonId` (uint): The ID of the newly added dungeon.
- `name` (string): The name of the dungeon.
- `startIn` (uint): The start time of the dungeon.
- `endIn` (uint): The end time of the dungeon.
- `minTermDate` (uint): The minimum term date for the dungeon.
- `maxTermDate` (uint): The maximum term date for the dungeon.
- `minMintFee` (uint): The minimum mint fee required to start a session in the dungeon.
- `difficulty` (uint): The difficulty level of the dungeon.
- `availableRewards` (uint): The total rewards available in the dungeon.

**Functionality**:
- Only callable by an account with the `DUGEON_ROLE`.
- Adds a new dungeon to the game with the specified parameters.
- Updates the rewards pool with the available rewards for the dungeon.
- Emits a `DungeonAdded` event with the dungeon details.
