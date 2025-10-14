import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-16 h-16'
  };

  return (
    <div className={cn(
      "rounded-lg flex items-center justify-center",
      sizeClasses[size],
      className
    )}>
      <img 
        src="/ChatGPT_Image_Oct_14__2025__11_04_53_AM-removebg-preview.png" 
        alt="ScribeAI Logo" 
        className="w-full h-full object-contain"
      />
    </div>
  );
};