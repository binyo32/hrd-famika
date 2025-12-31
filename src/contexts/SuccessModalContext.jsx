import React, { createContext, useState, useContext, useCallback } from 'react';

const SuccessModalContext = createContext();

export const useSuccessModal = () => useContext(SuccessModalContext);

export const SuccessModalProvider = ({ children }) => {
  const [successModalProps, setSuccessModalProps] = useState({
    isOpen: false,
    title: '',
    description: '',
    leaveRequestNumber: null,
  });

  const showSuccessModal = useCallback((props) => {
    setSuccessModalProps({ ...props, isOpen: true });
  }, []);

  const hideSuccessModal = useCallback(() => {
    setSuccessModalProps(prev => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <SuccessModalContext.Provider value={{ successModalProps, showSuccessModal, hideSuccessModal }}>
      {children}
    </SuccessModalContext.Provider>
  );
};