// SPDX-License-Identifier: MIT

/*
  _                          
 | |                         
 | |     __ ___      __      
 | |    / _` \ \ /\ / /      
 | |___| (_| |\ V  V /       
 |______\__,_| \_/\_/        
 |__   __|  | |              
    | | ___ | | _____ _ __   
    | |/ _ \| |/ / _ \ '_ \  
    | | (_) |   <  __/ | | | 
    |_|\___/|_|\_\___|_| |_| 
                             
                             
*/

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LawToken is ERC20, Ownable {
    enum Tier {
        TraineeSolicitor,
        Associate,
        SeniorAssociate,
        SeniorCounsel,
        Partner
    }

    struct User {
        string name;
        Tier tier;
        uint256 points;
        uint256 receivedPoints;
        uint256 lastRedemptionRound;
        TokenReceipt[] receipts;
    }

    struct TokenReceipt {
        uint256 amount;
        string reason;
        uint256 timestamp;
    }

        struct TokenBatch {
        uint256 amount;
        uint256 timestamp;
    }

    mapping(address => User) public users;
    mapping(address => uint256) public lastMintTime;
    mapping(address => bool) public whitelist;
    mapping(address => TokenBatch[]) public tokenBatches;

    address[] public userList;
    string[] public userNameList;
    uint256 public constant ROUND_DURATION = 43800 minutes;

    uint256 public roundStartTime;
    uint256 public currentRound;

    mapping(address => bool) public manager;
    bool public isWhitelistActive = false;
    bool private initialized = false;

    event PointsDistributed(
        address indexed from,
        address indexed to,
        uint256 amount,
        string reason
    );

    constructor() ERC20("Law Token", "LAW") {
        roundStartTime = block.timestamp;
        currentRound = 1;
    }

function initializeRoles() public onlyOwner {
    require(!initialized, "Roles have already been initialized");
    manager[_msgSender()] = true;
    initialized = true;
}

    modifier onlyManager() {
        require(manager[_msgSender()] == true, "Caller is not a manager");
     _;
    }

    modifier onlyOwnerOrManager() {
        require(owner() == _msgSender() || manager[_msgSender()] == true, "Caller is neither the owner nor a manager");
        _;
    }

    function joinPlatform(string memory _name) public {
        require(users[msg.sender].points == 0, "User already joined");
        require(
            !isWhitelistActive || whitelist[msg.sender],
            "Address not whitelisted"
        );
        shouldStartNewRound();
        users[msg.sender].name = _name;
        users[msg.sender].points = 15;
        users[msg.sender].lastRedemptionRound = 0;
        userList.push(msg.sender);
        userNameList.push(_name);
    }

    function getInitialPointsForTier(Tier _tier) public pure returns (uint256) {
        if (_tier == Tier.Partner) {
            return 300;
        } else if (_tier == Tier.SeniorCounsel) {
            return 125;
        } else if (_tier == Tier.SeniorAssociate) {
            return 90;
        } else if (_tier == Tier.Associate) {
            return 30;
        } else {
            return 15;
        }
    }

    function setUserTier(address _user, Tier _tier)
        public
        onlyManager
    {
        shouldStartNewRound();
        users[_user].tier = _tier;
        uint256 tierPoints = getInitialPointsForTier(_tier);
        if (tierPoints > users[_user].points) {
            users[_user].points = tierPoints;
        }
    }

function distributePoints(
    address _to,
    uint256 _amount,
    string memory reason
) public {
    shouldStartNewRound();

    require(users[msg.sender].points >= _amount, "Insufficient points");

    require(
        _to != msg.sender,
        "Users cannot distribute points to themselves"
    );

    users[msg.sender].points -= _amount;
    users[_to].receivedPoints += _amount;
    uint256 tokensToMint = _amount * (10**18);
    _mint(_to, tokensToMint);
    lastMintTime[_to] = block.timestamp;
    TokenBatch memory newBatch = TokenBatch({
        amount: tokensToMint,
        timestamp: block.timestamp
    });
    tokenBatches[_to].push(newBatch);

    emit PointsDistributed(msg.sender, _to, _amount, reason);

    TokenReceipt memory receipt = TokenReceipt({
        amount: _amount,
        reason: reason,
        timestamp: block.timestamp
    });
    users[_to].receipts.push(receipt);
}

function burnExpiredTokens(address _user) public {
    require(
        msg.sender == _user,
        "Caller is not the token owner"
    );
    
    uint256 totalBurnable = 0;
    uint256 currentTime = block.timestamp;
    
    for (uint256 i = 0; i < tokenBatches[_user].length; i++) {
        if (currentTime >= tokenBatches[_user][i].timestamp + 365 days) {
            totalBurnable += tokenBatches[_user][i].amount;
            delete tokenBatches[_user][i];
        }
    }
    
    if(totalBurnable > 0) {
        _burn(_user, totalBurnable);
    }
}


    function shouldStartNewRound() private returns (bool) {
        if (block.timestamp >= roundStartTime + ROUND_DURATION) {
            startNewRound();
            return true;
        }
        return false;
    }

    function startNewRound() private {
        roundStartTime = block.timestamp;
        currentRound += 1;
        for (uint256 i = 0; i < userList.length; i++) {
            User storage user = users[userList[i]];
            user.points = getInitialPointsForTier(user.tier);
        }
    }

    function addToWhitelist(address _address) public onlyManager {
        whitelist[_address] = true;
    }

    function addToWhitelistBulk(address[] memory _addresses) public onlyManager {
        for (uint256 i = 0; i < _addresses.length; i++) {
            whitelist[_addresses[i]] = true;
        }
    }

    function removeFromWhitelist(address _address)
        public
        onlyManager
    {
        whitelist[_address] = false;
    }

    function toggleWhitelist() public onlyManager {
        isWhitelistActive = !isWhitelistActive;
    }

function _beforeTokenTransfer(
    address from,
    address to,
    uint256 amount
) internal override {
    super._beforeTokenTransfer(from, to, amount);

    if (from != address(0)) {
        if (isWhitelistActive) {
            require(
                to == address(this) || whitelist[to],
                "LawToken: Tokens can only be sent back to the contract or to a whitelisted address"
            );
        } else {
            require(
                to == address(this),
                "LawToken: Tokens can only be sent back to the contract"
            );
        }
        burnExpiredTokens(from);
    }
}


    function getUserCount() public view returns (uint256) {
        return userList.length;
    }

    function getUserPoints(address userAddress) public view returns (uint256) {
        return users[userAddress].points;
    }

    function getUserReceivedPoints(address userAddress)
        public
        view
        returns (uint256)
    {
        return users[userAddress].receivedPoints;
    }
function addManager(address newManager) public onlyOwnerOrManager {
    manager[newManager] = true;
}

function removeManager(address managerToRemove) public onlyOwnerOrManager {
    require(manager[managerToRemove] == true, "Address is not a manager");
    manager[managerToRemove] = false;
}

    function getUserTier(address userAddress) public view returns (Tier) {
        return users[userAddress].tier;
    }

    function getUserReceipts(address userAddress)
        public
        view
        returns (TokenReceipt[] memory)
    {
        return users[userAddress].receipts;
    }
}
