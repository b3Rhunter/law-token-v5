import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import ABI from './ABI.json';
import Notification from './Notification';
import logo from './images/logo.svg'

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
  const [distribute, setDistribute] = useState(false)
  const [join, setJoin] = useState(false)
  const [newUser, setNewUser] = useState('')
  const [hasJoined, setHasJoined] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [hasPoints, doesHavePoints] = useState(false);
  const [userName, setUserName] = useState("");
  const [selectedUserTier, setSelectedUserTier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ message: '', show: false });

  const connect = async () => {
    setLoading(true)
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner()
      const address = "0xB27fa868FA4ABDAc196cd4f4606E1c79DA185D86"
      const getContract = new ethers.Contract(address, ABI, signer);
      setContract(getContract)
      const userAddr = await signer.getAddress();
      setUserAddress(userAddr);
      await signer.signMessage("Welcome Law-yers!");
      setConnected(true)
      showNotification("Welcome " + userAddr.substr(0, 6) + "...");
      checkIfUserJoined(userAddr, getContract);
      checkIfUserIsManager(userAddr, getContract);
    } catch (error) {
      setConnected(false)
      setLoading(false)
      showNotification(error.message)
    }
    setLoading(false)
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
        const userTier = await contract.getUserTier(userAddress); // pass userAddress instead of i
        tempUserTier.push(userTier.toString());
        tempUserList.push(userAddress);
        tempUserNameList.push(userName);
      }
      setUserList(tempUserList);
      setUserNameList(tempUserNameList);
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
      showNotification("Welcome " + userName ? userName : userAddress.substr(0, 6) + "...");
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
      const managerRole = await contractToUse.MANAGER_ROLE();
      const isUserManager = await contractToUse.hasRole(managerRole, userAddress);
      setIsManager(isUserManager);
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
      const tx = await contract.joinPlatform(newUser);
      await tx.wait();
      fetchBalances();
      showNotification("Successfully Joined!");
      setHasJoined(true)
    } catch (error) {
      setLoading(false)
      showNotification("Error Joining Platform: " + error.message);
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
      const tx = await contract.distributePoints(recipientAddress, pointsToDistribute);
      await tx.wait();
      fetchBalances();
      showNotification("Successfully distributed points!");
    } catch (error) {
      setLoading(false)
      showNotification("Error:", error);
    }
    setLoading(false)
  };

  const addManager = async () => {
    if (isManager && selectedUser) {
      try {
        setLoading(true);
        const tx = await contract.addManager(selectedUser);
        await tx.wait();
        showNotification("Added Manager " + selectedUser);
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
        showNotification(`Set ${selectedUserName}'s tier to ${selectedUserTier}`);
      } catch (error) {
        console.error('Error setting user tier:', error);
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

  function openDistribute() {
    setDistribute(true)
    setJoin(false)
  }

  function openJoin() {
    setJoin(true)
    setDistribute(false)
  }

  useEffect(() => {
    if (connected && contract) {
      fetchBalances();
      fetchUserList();
    }
  }, [connected, contract]);

  return (


    <main className="parent">
      <div className={`loading ${loading ? 'show' : ''}`}>
        <div className="loader"></div>
      </div>
      <header className="glass">
        <img className='logo' style={{ width: "50px", height: "50px" }} src={logo} alt='logo' />
        <button className="glass" onClick={connect}>
          {!connected && <p>CONNECT</p>}
          {connected && <p>{userName ? userName : userAddress.substr(0, 6) + "..."}</p>}
        </button>

      </header>
      
      <section className="glass">
        {!connected && (
          <p>please connect...</p>
        )}
        {connected && (
          <div>
            <div className='nav'>
              {isManager &&
                <>
                  <button className="start glass" onClick={createRewardPool}>
                    Start Round
                  </button>
                  <button className="start glass" onClick={addManager}>
                    Add Manager
                  </button>
                  <select className='start glass' onChange={(e) => setSelectedUserTier(e.target.value)}>
                    <option value="">Select Tier</option>
                    <option value="0">Trainee Solicitor</option>
                    <option value="1">Associate</option>
                    <option value="2">Senior Associate</option>
                    <option value="3">Senior Counsel</option>
                    <option value="4">Partner</option>
                  </select>
                  <button className="start glass" onClick={setUserTier}>
                    Set User Tier
                  </button>
                </>
              }
            </div>

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

                  <button className='distBtn glass' onClick={distributePoints}>Distribute</button>
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
      
      <Notification
        message={notification.message}
        show={notification.show}
        setShow={(show) => setNotification({ ...notification, show })} />
    </main>
  );
}

export default App;
