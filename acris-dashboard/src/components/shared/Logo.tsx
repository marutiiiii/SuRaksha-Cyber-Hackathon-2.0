import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  theme?: "default" | "dark" | "light";
  className?: string;
  onClick?: () => void;
  collapsed?: boolean;
}

export default function Logo({ size = "md", theme = "default", className, onClick, collapsed = false }: LogoProps) {
  const navigate = useNavigate();
  
  const textClass = theme === "dark" 
    ? "text-white" 
    : theme === "light" 
    ? "text-slate-900" 
    : "text-foreground";

  const sizeClasses = {
    sm: {
      box: "w-7 h-7 text-xs rounded-md",
      text: "text-xs tracking-wider",
    },
    md: {
      box: "w-8 h-8 text-sm rounded-lg",
      text: "text-sm tracking-wider",
    },
    lg: {
      box: "w-10 h-10 text-base rounded-xl",
      text: "text-base tracking-widest",
    }
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    } else {
      navigate("/");
    }
  };

  const renderIcon = () => (
    <svg 
      viewBox="0 0 32 32" 
      className={cn(
        size === "sm" ? "w-7 h-7" : size === "lg" ? "w-10 h-10" : "w-8 h-8",
        "flex-shrink-0"
      )}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoBlueGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E90FF" />
          <stop offset="100%" stopColor="#0057FF" />
        </linearGradient>
      </defs>
      <g 
        stroke="url(#logoBlueGrad)" 
        strokeWidth="3.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        {/* Governance Pillar */}
        <path d="M8 6V26" />
        {/* Compliance Cycle Loop */}
        <path d="M8 8H17C20.5 8 23 10.5 23 13.5C23 16.5 20.5 19 17 19H8" />
        {/* Workflow Leg & Progress Arrow */}
        <path d="M13 19L21 27H27" />
        <path d="M24 24L27 27L24 30" />
      </g>
    </svg>
  );

  if (collapsed) {
    return null;
  }

  return (
    <div 
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2.5 overflow-hidden select-none cursor-pointer hover:opacity-90 transition-opacity",
        className
      )}
    >
      <img 
        src="/logo.png" 
        alt="ReguFlow AI Logo" 
        className={cn(
          size === "sm" ? "h-10" : size === "lg" ? "h-[70px]" : "h-[60px]",
          "w-auto object-contain"
        )}
      />
    </div>
  );
}