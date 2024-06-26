# Game Contract Functions Documentation

This document describes the main functions of the Game contract, their inputs, outputs, and functionality, with examples for React developers.

## addDungeon

**Description**: Adds a new dungeon to the game.

**Input**:

-   `_name` (string): The name of the dungeon.
-   `_startIn` (uint): The start time of the dungeon.
-   `_endIn` (uint): The end time of the dungeon.
-   `_minTermDate` (uint): The minimum term date for the dungeon.
-   `_maxTermDate` (uint): The maximum term date for the dungeon.
-   `_minMintFee` (uint): The minimum mint fee required to start a session in the dungeon.
-   `_difficulty` (uint): The difficulty level of the dungeon.
-   `_availableRewards` (uint): The total rewards available in the dungeon.

**Output**: Emits a `DungeonAdded` event.

**Example**:

```javascript
await gameContract.addDungeon(name, startIn, endIn, minTermDate, maxTermDate, minMintFee, difficulty, availableRewards)
```

## 1. start

**Description**: Initiates a new game session for a specific dungeon.

**Input**:

-   `_dungeonId` (uint): The ID of the dungeon to start the game in.
-   `operator` (address): The address allowed to operate on behalf of the user.

**Output**: Emits a `NewSession` event.

**Example**:

```javascript
await gameContract.start(dungeonId, operator, { value: ethers.utils.parseEther('0.1') })
```

## 2. end

**Description**: Ends a game session, determining the outcome and potential rewards.

**Input**:

-   `_tokenId` (uint): The ID of the game session to end.
-   `completed` (bool): Whether the game was successfully completed.
-   `ts` (uint): The timestamp of the end action.
-   `_signature` (bytes): A signature to verify the end action (if required).

**Output**: Emits an `EndSession` event.

**Example**:

```javascript
await gameContract.end(tokenId, completed, timestamp, signature)
```

## 3. claim

**Description**: Allows a user to claim their rewards from a completed game session.

**Input**:

-   `_tokenId` (uint): The ID of the game session to claim rewards from.

**Output**: Emits a `Claim` event.

**Example**:

```javascript
await gameContract.claim(tokenId)
```

## 4. getDungeonInfo

**Description**: Retrieves information about a specific dungeon.

**Input**:

-   `_dungeonId` (uint): The ID of the dungeon to get information for.

**Output**: Returns a `Dungeon` struct.

**Example**:

```javascript
const dungeonInfo = await gameContract.getDungeonInfo(dungeonId)
```

## 5. getSessionInfo

**Description**: Retrieves information about a specific game session.

**Input**:

-   `_tokenId` (uint): The ID of the game session to get information for.

**Output**: Returns a `Session` struct.

**Example**:

```javascript
const sessionInfo = await gameContract.getSessionInfo(tokenId)
```

## 6. getUserSessions

**Description**: Retrieves all active game sessions for a specific user.

**Input**:

-   `_user` (address): The address of the user to get sessions for.

**Output**: Returns an array of `uint` values representing the token IDs of the user's active sessions.

**Example**:

```javascript
const userSessions = await gameContract.getUserSessions(userAddress)
```

## 7. getUserFinishedSessions

**Description**: Retrieves all finished game sessions for a specific user.

**Input**:

-   `_user` (address): The address of the user to get finished sessions for.

**Output**: Returns an array of `uint` values representing the token IDs of the user's finished sessions.

**Example**:

```javascript
const finishedSessions = await gameContract.getUserFinishedSessions(userAddress)
```

## 8. getDungeonSessions

**Description**: Retrieves all active game sessions for a specific dungeon.

**Input**:

-   `_dungeonId` (uint): The ID of the dungeon to get sessions for.

**Output**: Returns an array of `uint` values representing the token IDs of the active sessions in the dungeon.

**Example**:

```javascript
const dungeonSessions = await gameContract.getDungeonSessions(dungeonId)
```

## 9. getDungeonFinishedSessions

**Description**: Retrieves all finished game sessions for a specific dungeon.

**Input**:

-   `_dungeonId` (uint): The ID of the dungeon to get finished sessions for.

**Output**: Returns an array of `uint` values representing the token IDs of the finished sessions in the dungeon.

**Example**:

```javascript
const finishedDungeonSessions = await gameContract.getDungeonFinishedSessions(dungeonId)
```

## 10. getAllDungeons

**Description**: Retrieves all dungeon IDs.

**Input**: None

**Output**: Returns an array of `uint` values representing all dungeon IDs.

**Example**:

```javascript
const allDungeons = await gameContract.getAllDungeons()
```

## 11. getAllActiveDungeons

**Description**: Retrieves all active dungeon IDs.

**Input**: None

**Output**: Returns an array of `uint` values representing the IDs of all active dungeons.

**Example**:

```javascript
const activeDungeons = await gameContract.getAllActiveDungeons()
```

## 12. dungeonsOf

**Description**: Retrieves all dungeon IDs owned by a specific user.

**Input**:

-   `_user` (address): The address of the user to get owned dungeons for.

**Output**: Returns an array of `uint` values representing the IDs of dungeons owned by the user.

**Example**:

```javascript
const userDungeons = await gameContract.dungeonsOf(userAddress)
```
