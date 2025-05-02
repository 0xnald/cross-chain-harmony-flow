import React from 'react';

const Footer = () => {
  return (
    <footer className="border-t border-border/40 bg-muted/30 backdrop-blur-xl mt-8">
      <div className="container flex h-16 items-center px-4 justify-between text-sm text-muted-foreground">
        <p>Cross-Chain Harmony Flow</p>
        <p>Made with ❤️ by <a href="https://x.com/linoxbt" className="underline">Linoxbt</a></p>
      </div>
    </footer>
  );
};

export default Footer;
