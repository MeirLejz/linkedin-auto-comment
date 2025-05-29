import React from 'react';

function Success() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold mb-4">Payment Successful!</h1>
        <p className="text-gray-600 mb-4">Your Pro plan will be activated shortly.</p>
        <a href="/" className="btn">
          Return to Home
        </a>
      </div>
    </div>
  );
}

export default Success;