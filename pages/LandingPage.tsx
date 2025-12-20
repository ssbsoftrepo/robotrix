
import React from 'react';

interface LandingPageProps {
    onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-between text-center p-6 bg-[#131314] animate-fade-in relative">
            <div className="flex-grow flex flex-col items-center justify-center w-full">
                <div className="mb-8 select-none">
                    <h1 className="text-6xl md:text-8xl font-extrabold text-gray-100 tracking-tighter">
                        ROBOTRIX<span className="text-[#6D282C]">+</span>
                    </h1>
                </div>
                
                <div className="max-w-4xl mx-auto space-y-1 mb-16">
                    <p className="text-xl md:text-3xl text-gray-400 font-light leading-relaxed">
                        Safe & personalized TKR Functional Alignment execution platform
                    </p>
                    <p className="text-lg md:text-2xl text-gray-400 font-medium tracking-wide uppercase">
                        With advanced planning Matrix
                    </p>
                </div>

                <button 
                    onClick={onEnter}
                    className="px-14 py-5 bg-[#6D282C] hover:bg-[#893338] text-white font-bold text-2xl rounded-full transition-all duration-300 transform hover:scale-105 shadow-[0_0_30px_rgba(109,40,44,0.4)] hover:shadow-[0_0_50px_rgba(109,40,44,0.6)] focus:outline-none focus:ring-4 focus:ring-[#6D282C]/50"
                >
                    ENTER
                </button>
            </div>

            <div className="pb-6">
                 <p className="text-gray-500 text-lg font-medium">Powered by PLUS Orthopedics</p>
            </div>
        </div>
    );
};

export default LandingPage;
