
import React from 'react';

const Footer = () => {
  return (
    <footer className="border-t border-border/40 bg-muted/30 backdrop-blur-xl mt-8">
      <div className="container flex h-16 items-center px-4 justify-between text-sm text-muted-foreground">
        <p>Cross-Chain Harmony Flow</p>
        <p>© {new Date().getFullYear()} - Testnet version</p>
      </div>
    </footer>
  );
};

export default Footer;
