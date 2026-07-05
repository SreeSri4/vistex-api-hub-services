import React from 'react';

interface HeaderProps {
  onNewUpload?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNewUpload }) => {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 shadow-lg">
      <div className="max-w-full mx-auto flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">🔌 Vistex Industry Templates API Hub</h1>
          <p className="text-blue-100 text-sm">
            Multi-tenant API Documentation
          </p>
        </div>
        <button
          onClick={onNewUpload}
          className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-semibold transition"
        >
          ➕ Upload New Config
        </button>
      </div>
    </header>
  );
};
