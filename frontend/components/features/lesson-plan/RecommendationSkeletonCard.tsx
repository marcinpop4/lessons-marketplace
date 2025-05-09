import React from 'react';

const RecommendationSkeletonCard: React.FC = () => {
    return (
        <div className="p-4 border rounded-lg bg-white shadow-sm animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
            <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6 mb-2"></div>
            <div className="h-2 bg-gray-200 rounded w-1/4 mt-3"></div>
        </div>
    );
};

export default RecommendationSkeletonCard; 