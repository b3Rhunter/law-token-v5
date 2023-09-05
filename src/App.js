import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import ABI from './ABI.json';
import Notification from './Notification';
import logo from './images/logo.svg';
import { GrUserAdmin } from 'react-icons/gr';
import { AiOutlineCloseCircle } from 'react-icons/ai';
import { BsPersonAdd } from 'react-icons/bs';
import { IoIosAddCircleOutline } from 'react-icons/io';
import { FcCurrencyExchange } from 'react-icons/fc';
import Accounting from './Accounting';

 const address = "0x42884740FF9be348b5c2f8F6b6369Bf1c16dDAb3"; 

function App() {

  const [connected, setConnected] = useState(false);
  const [contract, setContract] = useState();
  const [recipientAddress, setRecipientAddress] = useState('');
  const [pointsToDistribute, setPointsToDistribute] = useState('');
  const [userAddress, setUserAddress] = useState('0x0000');
  const [pointBalance, setPointBalance] = useState(0);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [userList, setUserList] = useState([]);
  const [userNameList, setUserNameList] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUser, setUser] = useState("select user")
  const [selectedUserName, setSelectedUserName] = useState('');
  const [newUser, setNewUser] = useState('')
  const [hasJoined, setHasJoined] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [hasPoints, doesHavePoints] = useState(false);
  const [userName, setUserName] = useState("");
  const [selectedUserTier, setSelectedUserTier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ message: '', show: false });
  const [showAdmin, setShowAdmin] = useState(false);
  const [whitelistControls, setWhitelistControls] = useState(false);
  const [whitelistAddress, setWhitelistAddress] = useState('');
  const [userListFetched, setUserListFetched] = useState(false);
  const [accounting, setAccounting] = useState(false);
  const [distributionReason, setDistributionReason] = useState('');
  const [userReceipts, setUserReceipts] = useState([]);

  const connect = async () => {
    setLoading(true);
    try {
      let provider;
      provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();
      const desiredChainId = '0x89'; // 0x89 polygon   -   0x14A33 base goerli
      if (network.chainId !== parseInt(desiredChainId)) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: desiredChainId }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: desiredChainId,
                  chainName: 'Polygon',
                  nativeCurrency: {
                    name: 'Matic',
                    symbol: 'MATIC',
                    decimals: 18
                  },
                  rpcUrls: ['https://polygon.llamarpc.com'], // https://polygon.llamarpc.com - https://goerli.base.org
                  blockExplorerUrls: ['https://polygonscan.com'], // https://polygonscan.com - https://goerli.basescan.org
                }],
              });
            } catch (addError) {
              throw addError;
            }
          } else {
            throw switchError;
          }
        }
      }
      provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const getContract = new ethers.Contract(address, ABI, signer);
      setContract(getContract);
      const userAddr = await signer.getAddress();
      setUserAddress(userAddr);
      await signer.signMessage("Welcome Lawyers!");
      setConnected(true);
      checkIfUserJoined(userAddr, getContract);
      checkIfUserIsManager(userAddr, getContract);
      showNotification("Welcome " + userAddr.substr(0, 6) + "...");
    } catch (error) {
      setConnected(false);
      setLoading(false);
      showNotification('Error connecting wallet...');
    }
    setLoading(false);
  };

  const fetchUserReceipts = async () => {
    try {
      const receipts = await contract.getUserReceipts(userAddress);
      setUserReceipts(receipts);
    } catch (error) {
      console.log(error);
    }
  }

  const fetchUserList = async () => {
    setLoading(true)
    try {
      const userCount = await contract.getUserCount();
      let tempUserList = [];
      let tempUserNameList = [];
      let tempUserTier = [];
      for (let i = 0; i < userCount; i++) {
        const userAddress = await contract.userList(i);
        const userName = await contract.userNameList(i);
        const userTier = await contract.getUserTier(userAddress);
        tempUserTier.push(userTier.toString());
        tempUserList.push(userAddress);
        tempUserNameList.push(userName);
      }
      setUserList(tempUserList);
      setUserNameList(tempUserNameList);
      setUserListFetched(true);
    } catch (error) {
      setLoading(false)
      console.error('Error fetching user list:', error);
    }
    setLoading(false)
  };

  const fetchBalances = async () => {
    setLoading(true)
    try {
      const tokenBal = await contract.balanceOf(userAddress);
      const points = await contract.getUserPoints(userAddress);
      setPointBalance(points.toString());
      if (points.toString() !== "0") {
        doesHavePoints(true)
      }
      const tokenBalInEther = ethers.utils.formatEther(tokenBal);
      const wholeNumberTokenBal = Math.floor(parseFloat(tokenBalInEther));
      setTokenBalance(wholeNumberTokenBal.toString());
    } catch (error) {
      setLoading(false)
      console.error('Error fetching balances:', error);
    }
    setLoading(false)
  };

  const checkIfUserJoined = async (userAddress, contract) => {
    setLoading(true)
    try {
      const userCount = await contract.getUserCount();
      for (let i = 0; i < userCount; i++) {
        const currentUserAddress = await contract.userList(i);
        if (currentUserAddress.toLowerCase() === userAddress.toLowerCase()) {
          const currentUser = await contract.users(currentUserAddress);
          setHasJoined(true);
          setUserName(currentUser.name);
          return;
        }
      }
      setHasJoined(false);
    } catch (error) {
      setLoading(false)
      console.error('Error checking if user has joined:', error);
    }
    setLoading(false)
  };

  const checkIfUserIsManager = async (userAddress, contractToUse) => {
    setLoading(true)
    try {
      const managerRole = await contractToUse.manager(userAddress);
      setIsManager(managerRole);
    } catch (error) {
      setLoading(false)
      console.error('Error checking if user is manager:', error);
    }
    setLoading(false)
  };

  const joinPlatform = async (newUser) => {
    if (!contract) return;
    setLoading(true)
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()
      const userAddr = await signer.getAddress();
      const tx = await contract.joinPlatform(newUser);
      await tx.wait();
      fetchBalances();
      checkIfUserJoined(userAddr, contract);
      fetchUserList();
      showNotification("Successfully Joined!");
      setHasJoined(true)
    } catch (error) {
      setLoading(false)
      showNotification("Error Joining Platform: ");
    }
    setLoading(false)
  };

  const createRewardPool = async () => {
    if (!contract) return;
    setLoading(true)
    try {
      const tx = await contract.createRewardPool();
      await tx.wait();
      fetchBalances();
      showNotification("Round Started!");
    } catch (error) {
      setLoading(false)
      showNotification("Round Already Started!");
    }
    setLoading(false)
  };

  const distributePoints = async () => {
    if (!contract) return;
    setLoading(true)
    try {
      const tx = await contract.distributePoints(recipientAddress, pointsToDistribute, distributionReason);
      await tx.wait();
      fetchBalances();
      showNotification("Successfully distributed points!");
    } catch (error) {
      setLoading(false)
      showNotification("Not enough points or invalid user.");
    }
    setLoading(false)
  };

  const addManager = async () => {
    if (isManager && selectedUser) {
      try {
        setLoading(true);
        const tx = await contract.addManager(selectedUser);
        await tx.wait();
        showNotification("Added Manager " + selectedUser.substr(0, 6) + "...");
      } catch (error) {
        console.error('Error adding manager:', error);
      } finally {
        setLoading(false);
      }
    } else {
      showNotification("You're not a manager or no user is selected");
    }
  };

  const setUserTier = async () => {
    if (isManager && selectedUser && selectedUserTier !== null) {
      try {
        setLoading(true);
        const tx = await contract.setUserTier(selectedUser, selectedUserTier);
        await tx.wait();
        fetchBalances();
        showNotification(`${selectedUserName}'s tier updated`);
      } catch (error) {
        console.error('Error setting user tier');
      } finally {
        setLoading(false);
      }
    } else {
      showNotification("Error setting user's tier. Please try again.");
    }
  };

  const handleClick = (newValue, newName) => {
    setRecipientAddress(newValue);
    setShowDropdown(false);
    setUser(newValue)
    setSelectedUserName(newName);
  };

  const showNotification = (message) => {
    setNotification({ message, show: true });
  };

  useEffect(() => {
    if (connected && contract) {
      fetchBalances();
      fetchUserList();
      fetchUserReceipts();
    }
  }, [connected, contract]);

  function admin() {
    setShowAdmin(true)
  }

  function closeAdmin() {
    setShowAdmin(false)
  }

  const installMetamask = () => {
    window.open('https://metamask.io/download.html', '_blank');
  };

  const toggleWhitelist = async () => {
    if (!contract) return;
    setLoading(true);
    try {
      const tx = await contract.toggleWhitelist();
      await tx.wait();
      showNotification("Whitelist toggled!");
    } catch (error) {
      showNotification("Error toggling whitelist: " + error.message);
      console.error(error);
    }
    setLoading(false);
  };

  const addToWhitelist = async (address) => {
    if (!contract) return;
    setLoading(true);
    try {
      const tx = await contract.addToWhitelist(address);
      await tx.wait();
      showNotification("Address added to whitelist!");
    } catch (error) {
      showNotification("Error adding to whitelist: " + error.message);
      console.error(error);
    }
    setLoading(false);
  };

  const removeFromWhitelist = async (address) => {
    if (!contract) return;
    setLoading(true);
    try {
      const tx = await contract.removeFromWhitelist(address);
      await tx.wait();
      showNotification("Address removed from whitelist!");
    } catch (error) {
      showNotification("Error removing from whitelist: " + error.message);
      console.error(error);
    }
    setLoading(false);
  };

  function showWhiteListControls() {
    setWhitelistControls(true)
  }

  function closeWhitelistControls() {
    setWhitelistControls(false)
  }

  const handleWhitelistAddressChange = (event) => {
    setWhitelistAddress(event.target.value);
  };

  const handleWhitelistAddition = (event) => {
    event.preventDefault();
    addToWhitelist(whitelistAddress);
  };

  const addTokenToMetaMask = async () => {
    try {
      const wasAdded = await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: address,
            symbol: 'LAW',
            decimals: '18',
            image: 'https://github.com/b3Rhunter/law-token-logo/raw/main/lawTokenLogo.png',
          },
        },
      });

      if (wasAdded) {
        console.log('Token was added!');
      } else {
        console.log('Token was not added');
      }
    } catch (error) {
      console.log('Error adding token to MetaMask:', error);
    }
  };

  function openAccounting() {
    setAccounting(true)
  }

  function closeAccounting() {
    setAccounting(false)
  }

  return (
    <main className="parent">
      <button className='addToken' onClick={addTokenToMetaMask}><FcCurrencyExchange /></button>
      <div className={`loading ${loading ? 'show' : ''}`}>
        <div className="loader"></div>
      </div>
      <header className="glass">
        <img className='logo' style={{ width: "50px", height: "50px" }} src={logo} alt='logo' />
        {typeof window.ethereum !== 'undefined' ? (
          <button className="glass" onClick={connect}>
            {!connected && <p>CONNECT</p>}
            {connected && <p>{userName ? userName : userAddress.substr(0, 6) + "..."}</p>}
          </button>
        ) : (
          <button className="glass" onClick={installMetamask}>
            Install Metamask
          </button>
        )}
      </header>

      <section className="glass">
        {!connected && (
          <p>please connect...</p>
        )}
        {connected && (
          <div>

            <div className='wrapper'>
              {!hasJoined && (
                <div className='cont'>
                  <input
                    className='glass'
                    type="text"
                    value={newUser}
                    onChange={(e) => setNewUser(e.target.value)}
                    placeholder="choose a user name" />
                  <br />
                  <button className='glass' onClick={() => joinPlatform(newUser)}>Register</button>
                </div>
              )}
              {hasJoined && (
                <div className='main-container'>
                  <div className='distribute'>
                    <div className="custom-dropdown" onClick={() => setShowDropdown(!showDropdown)}>
                      <button className="custom-dropdown-button distBtn glass">
                        {selectedUserName ? `${selectedUserName} - ${selectedUser.substr(0, 6)}...` : "Select User"}
                      </button>
                      {showDropdown && (
                        <div className="custom-dropdown-content">
                          {userList.map((userAddress, index) => (
                            <div
                              key={userAddress}
                              onClick={() => handleClick(userAddress, userNameList[index])}
                            >
                              {userNameList[index]} - {userAddress.substr(0, 6) + "..."}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      className='distInput glass'
                      type="text"
                      value={pointsToDistribute}
                      onChange={(e) => setPointsToDistribute(e.target.value)}
                      placeholder="Points to Distribute" />
                    <input
                      className='distInput glass'
                      type="text"
                      value={distributionReason}
                      onChange={(e) => setDistributionReason(e.target.value)}
                      placeholder="Reason for Distribution"
                    />

                    <button className='distBtn glass' onClick={distributePoints}>Distribute</button>
                  </div>

                  <div className='user-transactions'>
                    {userReceipts.length > 0 ? (
                      userReceipts.slice().reverse().map((receipt, index) => (
                        <div key={index} className="transaction-item">
                          <p>Received: <span>{receipt.amount.toString()}</span></p>
                          <p>Reason: <span>{receipt.reason}</span></p>
                          <p>Date: <span>{new Date(receipt.timestamp * 1000).toLocaleString()}</span></p>
                        </div>
                      ))
                    ) : (
                      <p style={{paddingLeft: "5px"}}>No transactions found.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <footer className="glass">
        <div className='balances'>
          <p>Points:</p>
          <p>{pointBalance}</p>
          <p>Tokens:</p>
          <p>{tokenBalance}</p>
        </div>
      </footer>

      {connected && (
        <div className='nav'>
          {isManager &&
            <>
              {!showAdmin && (
                <button className="admin glass" onClick={admin}><GrUserAdmin className='closeIcon' /></button>
              )}
              {showAdmin && (

                <>
                  {!whitelistControls && (
                    <button className='start glass' onClick={showWhiteListControls}>whitelist</button>
                  )}
                  {whitelistControls && (
                    <button className='start glass' onClick={closeWhitelistControls}>whitelist</button>
                  )}
                  {whitelistControls && (
                    <div className='whitelistControls'>
                      <button className='glass start' onClick={toggleWhitelist}>toggle whitelist</button>
                      <form onSubmit={handleWhitelistAddition}>
                        <input type='text' placeholder='whitelist address' onChange={handleWhitelistAddressChange} />
                        <input className='submit' type='submit' value='Add to whitelist' />
                      </form>
                    </div>
                  )}
                  <button className="start glass" onClick={addManager}>
                    <BsPersonAdd className='icons' />
                    Manager
                  </button>
                  <select className='start glass' onChange={(e) => setSelectedUserTier(e.target.value)}>
                    <option value="0">Trainee Solicitor</option>
                    <option value="1">Associate</option>
                    <option value="2">Senior Associate</option>
                    <option value="3">Senior Counsel</option>
                    <option value="4">Partner</option>
                  </select><button className="start glass" onClick={setUserTier}>
                    <IoIosAddCircleOutline className='icons' />
                    Tier
                  </button>
                  {!accounting && (
                    <button onClick={openAccounting} className="start glass">Accounting</button>
                  )}
                  {accounting && (
                    <button onClick={closeAccounting} className="start glass">Accounting</button>
                  )}

                  <button className="start glass" onClick={closeAdmin}><AiOutlineCloseCircle className='closeIcon' /></button>
                </>
              )}
            </>
          }
        </div>
      )}

      {accounting && (
        <div>
          {userListFetched && <Accounting contract={contract} userList={userList} />}
        </div>
      )}

      <Notification
        message={notification.message}
        show={notification.show}
        setShow={(show) => setNotification({ ...notification, show })} />
    </main>
  );
}

export default App;
