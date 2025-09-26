import { SVGAttributes } from 'react';

export default function StackIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M4 2L20 2C21.1046 2 22 2.89543 22 4L22 8C22 9.10457 21.1046 10 20 10L4 10C2.89543 10 2 9.10457 2 8L2 4C2 2.89543 2.89543 2 4 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M4 14L20 14C21.1046 14 22 14.8954 22 16L22 20C22 21.1046 21.1046 22 20 22L4 22C2.89543 22 2 21.1046 2 20L2 16C2 14.8954 2.89543 14 4 14Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
