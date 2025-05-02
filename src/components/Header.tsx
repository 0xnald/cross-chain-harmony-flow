
import React from 'react';

const Header = () => {
  return (
    <header className="border-b border-border/40 bg-muted/30 backdrop-blur-xl">
      <div className="container flex h-16 items-center px-4">
        <div className="mr-4 flex">
          <a href="/" className="flex items-center space-x-2">
            <div className="bg-primary rounded-md p-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"></path>
              </svg>
            </div>
            <span className="font-bold">Cross-Chain Harmony Flow</span>
          </a>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <div className="bg-muted text-muted-foreground rounded-full px-4 py-1 text-xs">
            Testnet Mode
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
