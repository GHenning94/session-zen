import { createContext, useContext, useState, ReactNode } from 'react';

interface ProfileModalContextType {
  isOpen: boolean;
  openToSecurity: () => void;
  close: () => void;
  shouldScrollToSecurity: boolean;
  resetScrollFlag: () => void;
}

const ProfileModalContext = createContext<ProfileModalContextType | undefined>(undefined);

export const ProfileModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldScrollToSecurity, setShouldScrollToSecurity] = useState(false);

  const openToSecurity = () => {
    setIsOpen(true);
    setShouldScrollToSecurity(true);
  };

  const close = () => {
    setIsOpen(false);
    setShouldScrollToSecurity(false);
  };

  const resetScrollFlag = () => {
    setShouldScrollToSecurity(false);
  };

  return (
    <ProfileModalContext.Provider
      value={{
        isOpen,
        openToSecurity,
        close,
        shouldScrollToSecurity,
        resetScrollFlag,
      }}
    >
      {children}
    </ProfileModalContext.Provider>
  );
};

export const useProfileModal = () => {
  const context = useContext(ProfileModalContext);
  if (!context) {
    throw new Error('useProfileModal must be used within ProfileModalProvider');
  }
  return context;
};
