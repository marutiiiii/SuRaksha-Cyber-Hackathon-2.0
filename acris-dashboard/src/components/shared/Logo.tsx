export default function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const containerHeight = size === "sm" ? "h-10" : "h-12";
  const logoHeight = size === "sm" ? "h-16" : "h-20";
  const logoTop = size === "sm" ? "top-[-12px]" : "top-[-16px]";
  
  return (
    <div className={`relative ${containerHeight} w-48`}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes logo-float-shared {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
          100% { transform: translateY(0px); }
        }
        .logo-floating-shared {
          animation: logo-float-shared 4s ease-in-out infinite;
          filter: drop-shadow(0 0 12px rgba(59,130,246,0.3));
        }
      `}} />
      <img 
        src="/logo.png" 
        alt="ReguFlow AI Logo" 
        className={`absolute left-0 ${logoTop} ${logoHeight} w-auto object-contain logo-floating-shared z-10`} 
      />
    </div>
  );
}