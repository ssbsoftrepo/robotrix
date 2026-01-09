import React from 'react';

interface LandingPageProps {
    onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#1E1E1E] to-[#121212] flex flex-col items-center justify-center text-center p-8 select-none">

            {/* Cinematic Overhead Surgical Lamp Effect */}
            <div className="absolute top-[-30%] left-1/2 transform -translate-x-1/2 w-[80vw] h-[80vw] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-[-10%] left-1/2 transform -translate-x-1/2 w-[40vw] h-[40vw] bg-white/5 rounded-full blur-[80px] pointer-events-none" />

            {/* Content Container */}
            <div className="relative z-10 flex flex-col items-center justify-center space-y-12 max-w-5xl w-full">

                {/* Brand Header */}
                <div className="space-y-4">
                    <h1 className="text-7xl md:text-9xl font-black text-[#E0E0E0] tracking-tighter leading-none drop-shadow-lg">
                        ROBOTRIX<span className="text-[#6D282C]">+</span>
                    </h1>
                    <div className="h-1 w-32 bg-[#2C2C2C] mx-auto rounded-full" />
                </div>

                {/* Subtext Description */}
                <div className="space-y-3">
                    <p className="text-2xl md:text-3xl text-gray-400 font-light tracking-wide">
                        Safe & Personalized TKR Functional Alignment
                    </p>
                    <p className="text-lg md:text-xl text-[#6D282C] font-semibold tracking-[0.2em] uppercase">
                        Execution Platform
                    </p>
                </div>

                {/* Enter Button - Matte Finish */}
                <button
                    onClick={onEnter}
                    className="group relative px-20 py-6 bg-[#6D282C] border border-[#893338] rounded-sm 
                               shadow-[0_4px_20px_rgba(109,40,44,0.4)] 
                               transition-all duration-300 ease-out
                               hover:bg-[#893338] hover:border-[#a04046] hover:shadow-[0_0_30px_rgba(109,40,44,0.6)]
                               active:scale-[0.98]"
                >
                    <div className="absolute inset-0 bg-noise opacity-[0.1] pointer-events-none" />
                    <span className="relative text-2xl font-bold text-white tracking-widest transition-colors">
                        ENTER
                    </span>

                    {/* Corner Accents for Technical Feel */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#ff8fa3]/30 transition-colors group-hover:border-white/50" />
                </button>

            </div>

            {/* Footer */}
            <div className="absolute bottom-8 text-gray-600 text-sm font-medium tracking-wider uppercase">
                Powered by PLUS Orthopedics
            </div>

            {/* Vignette for Focus */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,rgba(18,18,18,0.8)_100%)]" />
        </div>
    );
};

export default LandingPage;
