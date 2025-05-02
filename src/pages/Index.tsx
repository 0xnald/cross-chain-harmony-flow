
import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TransferForm from '@/components/TransferForm';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            Cross-Chain Harmony Flow
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            A secure and efficient interface for transferring tokens between different blockchain networks
            using IBC (Inter-Blockchain Communication) channels.
          </p>
        </div>
        
        <TransferForm />
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
