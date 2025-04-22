import React from 'react';

export const LoadingSpinner: React.FC = () => {
    // Placeholder implementation - just renders text
    return (
        <div className="flex items-center justify-center p-4">
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300 animate-pulse">
                Loading...
            </p>
        </div>
    );
};

// Optional: You could add more styling or a basic SVG later if needed 