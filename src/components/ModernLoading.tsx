
import React from 'react';

interface ModernLoadingProps {
  message?: string;
  subMessage?: string;
  progress?: number;
}

const ModernLoading: React.FC<ModernLoadingProps> = ({ 
  message = "Processing...", 
  subMessage = "Please wait while we process your files",
  progress 
}) => {
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-slate-200">
        {/* Animated Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-slate-200 animate-pulse"></div>
            <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-blue-600 animate-spin"></div>
            <div className="absolute inset-2 w-16 h-16 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin animation-delay-150"></div>
            <div className="absolute inset-4 w-12 h-12 rounded-full border-4 border-transparent border-t-purple-500 animate-spin animation-delay-300"></div>
          </div>
        </div>

        {/* Progress Bar */}
        {progress !== undefined && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div 
                className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">{message}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{subMessage}</p>
        </div>

        {/* Animated dots */}
        <div className="flex justify-center mt-4 space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce animation-delay-0"></div>
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce animation-delay-150"></div>
          <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce animation-delay-300"></div>
        </div>
      </div>
    </div>
  );
};

export default ModernLoading;
