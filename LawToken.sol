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
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract LawToken is ERC20, Ownable, AccessControl {
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
    }

    mapping(address => User) public users;
    mapping(address => uint256) public lastMintTime;
    address[] public userList;
    string[] public userNameList;
    uint256 public constant ROUND_DURATION = 43800 minutes;

    uint256 public roundStartTime;
    uint256 public currentRound;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bool private initialized = false;

    constructor() ERC20("Law Token", "LAW") {
        roundStartTime = block.timestamp;
        currentRound = 1;
    }

    function initializeRoles() public onlyOwner {
        require(!initialized, "Roles have already been initialized");
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MANAGER_ROLE, _msgSender());
        initialized = true;
    }

    function joinPlatform(string memory _name) public {
        require(users[msg.sender].points == 0, "User already joined");
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
        onlyRole(MANAGER_ROLE)
    {
        shouldStartNewRound();
        users[_user].tier = _tier;
        uint256 tierPoints = getInitialPointsForTier(_tier);
        if (tierPoints > users[_user].points) {
            users[_user].points = tierPoints;
        }
    }

    function distributePoints(address _to, uint256 _amount) public {
        shouldStartNewRound();
        require(users[msg.sender].points >= _amount, "Insufficient points");
        users[msg.sender].points -= _amount;
        users[_to].receivedPoints += _amount;
        uint256 tokensToMint = _amount * (10**18);
        _mint(_to, tokensToMint);
        lastMintTime[_to] = block.timestamp;
    }

    function burnExpiredTokens(address _user) public {
        require(
            hasRole(MANAGER_ROLE, msg.sender) || msg.sender == _user,
            "Caller is not a manager or the token owner"
        );
        require(
            lastMintTime[_user] + 365 days <= block.timestamp,
            "Tokens are not old enough to burn"
        );
        uint256 userBalance = balanceOf(_user);
        _burn(_user, userBalance);
        lastMintTime[_user] = 0;
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

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        super._beforeTokenTransfer(from, to, amount);

        if (from != address(0)) {
            require(
                to == address(this),
                "LawToken: Tokens can only be sent back to the contract"
            );
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

    function addManager(address newManager) public onlyRole(MANAGER_ROLE) {
        grantRole(MANAGER_ROLE, newManager);
    }

    function getUserTier(address userAddress) public view returns (Tier) {
        return users[userAddress].tier;
    }

    function removeManager(address manager) public onlyRole(MANAGER_ROLE) {
        revokeRole(MANAGER_ROLE, manager);
    }
}
