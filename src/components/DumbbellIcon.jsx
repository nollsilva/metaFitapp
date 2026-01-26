import React from 'react';

const DumbbellIcon = ({ size = 24, color = "currentColor", className = "" }) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <path
                d="M6.5 5C6.5 3.89543 5.60457 3 4.5 3H3C1.89543 3 1 3.89543 1 5V19C1 20.1046 1.89543 21 3 21H4.5C5.60457 21 6.5 20.1046 6.5 19V5Z"
                fill={color}
                fillOpacity="0.2"
                stroke={color}
                strokeWidth="1.5"
            />
            <path
                d="M23 5C23 3.89543 22.1046 3 21 3H19.5C18.3954 3 17.5 3.89543 17.5 5V19C17.5 20.1046 18.3954 21 19.5 21H21C22.1046 21 23 20.1046 23 19V5Z"
                fill={color}
                fillOpacity="0.2"
                stroke={color}
                strokeWidth="1.5"
            />
            <path
                d="M6.5 12H17.5"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M6.5 9H17.5"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity="0.5"
            />
            <path
                d="M6.5 15H17.5"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity="0.5"
            />
        </svg>
    );
};

export default DumbbellIcon;
