import { FC } from "react";

interface HeaderProps {
  isConnected: boolean;
}

const Header: FC<HeaderProps> = ({ isConnected }) => {
  return (
    <header className="bg-dark text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <i className="fas fa-cubes text-primary text-2xl"></i>
          <h1 className="text-xl font-bold">OpenAPI Generator</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div id="connection-status" className="flex items-center">
            <span 
              className={`w-2 h-2 ${isConnected ? 'bg-success' : 'bg-gray-400'} rounded-full mr-2`} 
              id="status-indicator">
            </span>
            <span className="text-sm" id="status-text">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <a 
            href="https://github.com/yourusername/openapi-generator" 
            target="_blank" 
            className="text-gray-300 hover:text-white"
          >
            <i className="fab fa-github text-xl"></i>
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;
