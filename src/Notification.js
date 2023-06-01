import React, { useEffect } from 'react';
import './Notification.css';

const Notification = ({ message, show, setShow }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        setShow(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, setShow]);

  return (
    <div className={`notification-container ${show ? 'show' : 'hide'}`}>
      <p>{message}</p>
    </div>
  );
};

export default Notification;
