import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';

const Accounting = ({contract, userList}) => {
    const [userDetails, setUserDetails] = useState([]);
    console.log('users: '+ userList)
    console.log('contract: '+ contract)
    const fetchUserDetails = async () => {
        
        let details = [];
        try {
          const count = await contract.getUserCount();
          const fetchDetails = Array(parseInt(count)).fill().map(async (_, i) => {
            const address = await userList[i];
            const user = await contract.users(address);
            const points = await contract.getUserPoints(address);
            const tokenBalance = await contract.balanceOf(address);
            details.push({
              name: user.name,
              address: address.substr(0, 6) + "...",
              points: points.toString(),
              tokenBalance: ethers.utils.formatEther(tokenBalance)
            });
          });
          await Promise.all(fetchDetails);
          setUserDetails(details);
        } catch (error) {
          console.log(error);
        }
      };

      useEffect(() => {
        if (contract && userList) {
          fetchUserDetails();
        }
      }, [contract, userList]);
      

    return (
        <div className='accounting'>

            <table className='accountingTable'>
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Address</th>
                        <th>Points</th>
                        <th>Tokens</th>
                    </tr>
                </thead>
                <tbody>
                    {userDetails.map((user, index) => (
                        <tr key={index}>
                            <td>{user.name}</td>
                            <td>{user.address}</td>
                            <td>{user.points}</td>
                            <td>{user.tokenBalance}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Accounting;
