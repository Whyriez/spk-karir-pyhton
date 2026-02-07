import { type SVGAttributes } from 'react';
import { useLayout } from '@/contexts/LayoutContext';

interface ApplicationLogoProps extends SVGAttributes<SVGElement> {
    className?: string;
}

export default function ApplicationLogo(props: ApplicationLogoProps) {
    const { appLogo } = useLayout();

    // Jika Admin sudah upload logo, tampilkan Image
    if (appLogo) {
        return (
            <img 
                src={appLogo} 
                alt="Logo Sekolah" 
                className={props.className} 
                style={{ objectFit: 'contain', height: '100%',maxHeight: '40px', maxWidth: '100%',width: 'auto' }} 
            />
        );
    }

    // Default Fallback (SVG Lama Anda)
    return (
        <svg width="30px" height="30px" viewBox="0 0 256 256" version="1.1" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" {...props}>
            <title>SPK</title>
            <defs>
                <linearGradient x1="0%" y1="0%" x2="100%" y2="100%" id="grad1">
                    <stop offset="0%" stopColor="#6366F1" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
                <linearGradient x1="100%" y1="0%" x2="0%" y2="100%" id="grad2">
                    <stop offset="0%" stopColor="#A78BFA" />
                    <stop offset="100%" stopColor="#C4B5FD" />
                </linearGradient>
            </defs>
            <g>
                <circle cx="128" cy="128" r="120" fill="url(#grad1)" opacity="0.1" />
                <path 
                    d="M 128 38 L 218 88 L 218 168 L 128 218 L 38 168 L 38 88 Z" 
                    fill="url(#grad1)" 
                />
                <path 
                    d="M 128 78 L 178 108 L 178 148 L 128 178 L 78 148 L 78 108 Z" 
                    fill="url(#grad2)" 
                    opacity="0.8"
                />
                <circle cx="128" cy="128" r="20" fill="#FFFFFF" opacity="0.9" />
            </g>
        </svg>
    );
}