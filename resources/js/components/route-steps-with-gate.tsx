import { SVGAttributes } from 'react';

export default function RouteStepsWithGate(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M4 17.5648L20 17.5648C21.1046 17.5648 22 18.1573 22 18.8882L22 21.5351C22 22.266 21.1046 22.8585 20 22.8585L4 22.8585C2.89543 22.8585 2 22.266 2 21.5351L2 18.8882C2 18.1573 2.89543 17.5648 4 17.5648Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M8.48798 9.35314L15.512 9.35314C15.9969 9.35314 16.39 9.94566 16.39 10.6766L16.39 13.3234C16.39 14.0543 15.9969 14.6469 15.512 14.6469L8.48798 14.6469C8.00308 14.6469 7.60998 14.0543 7.60998 13.3234L7.60998 10.6766C7.60998 9.94566 8.00308 9.35314 8.48798 9.35314Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M4 1.18009L20 1.18009C21.1046 1.18009 22 1.77261 22 2.50352L22 5.15037C22 5.88128 21.1046 6.4738 20 6.4738L4 6.4738C2.89543 6.4738 2 5.88128 2 5.15037L2 2.50352C2 1.77261 2.89543 1.18009 4 1.18009Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
