import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Page } from '../types';

interface NavItemProps {
    nav: Page | 'home';
    title: string;
    icon: React.JSX.Element;
    currentNav: Page;
    setNav: (page: Page) => void;
    onHomeClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ nav, title, icon, currentNav, setNav, onHomeClick }) => {
    const isActive = currentNav === nav;
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (nav === 'home') {
            onHomeClick();
        } else {
            setNav(nav);
        }
    };
    return (
        <a 
            href="#" 
            onClick={handleClick}
            className={`p-3 rounded-lg flex flex-col items-center space-y-1 text-center transition-all duration-200 ease-in-out ${isActive ? 'bg-[#6D282C] text-white scale-110' : 'hover:bg-[#6D282C] hover:text-white hover:scale-110'}`} 
            title={title}
        >
            {icon}
            <span className="text-xs font-medium">{title.split(' ')[0]}</span>
        </a>
    );
};

const Sidebar: React.FC = () => {
    const { page, setPage, setCurrentPatientId, setPlannerMode, plannerMode } = useAppContext();
    
    const handleHomeClick = () => {
        setCurrentPatientId(null);
        setPlannerMode(null);
        setPage('case-management');
    };

    const navItems = [
        <NavItem key="long-leg"
            nav="planner-long-leg" 
            title="Long Leg Film" 
            currentNav={page} 
            setNav={setPage}
            onHomeClick={handleHomeClick}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} 
        />,
        <NavItem key="valgus-stress"
            nav="planner-valgus-stress" 
            title="Valgus Stress Film" 
            currentNav={page} 
            setNav={setPage} 
            onHomeClick={handleHomeClick}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} 
        />
    ];

    if (plannerMode === 'advanced') {
        navItems.push(
            <NavItem key="functional"
                nav="functional-alignment-planner" 
                title="Functional Planner" 
                currentNav={page} 
                setNav={setPage} 
                onHomeClick={handleHomeClick}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M12 8h.01M15 8h.01M15 5h.01M12 5h.01M9 5h.01M4 7h1m16 0h-1m-1 12H6a2 2 0 01-2-2V7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2z" /></svg>} 
            />
        );
    }
    
    navItems.push(
         <NavItem key="simulation"
            nav="simulation" 
            title="Simulation" 
            currentNav={page} 
            setNav={setPage} 
            onHomeClick={handleHomeClick}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M8 12h8"></path><path d="M8 16h8"></path></svg>}
        />,
        <NavItem key="report"
            nav="report" 
            title="Report" 
            currentNav={page} 
            setNav={setPage} 
            onHomeClick={handleHomeClick}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2z" /></svg>} 
        />,
         <NavItem key="home"
            nav="home" 
            title="Home" 
            currentNav={page} 
            setNav={setPage}
            onHomeClick={handleHomeClick}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2l-7 7-7-7" /></svg>} 
        />
    );


    return (
        <nav className="w-24 min-h-full bg-[#1e1f20] p-4 flex-col items-center justify-center space-y-6 flex sm:flex no-print">
            {navItems}
        </nav>
    );
};

export default Sidebar;
