/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AuditLog from './pages/AuditLog';
import CandidateLogin from './pages/CandidateLogin';
import Certifications from './pages/Certifications';
import ClockIn from './pages/ClockIn';
import Dashboard from './pages/Dashboard';
import DevPanel from './pages/DevPanel';
import Discover from './pages/Discover';
import Events from './pages/Events';
import HRDashboard from './pages/HRDashboard';
import Home from './pages/Home';
import Messages from './pages/Messages';
import OfficerLogin from './pages/OfficerLogin';
import Officers from './pages/Officers';
import Onboarding from './pages/Onboarding';
import SOPs from './pages/SOPs';
import Schedule from './pages/Schedule';
import Settings from './pages/Settings';
import Sites from './pages/Sites';
import Timesheets from './pages/Timesheets';
import Training from './pages/Training';
import WhitelabelSetup from './pages/WhitelabelSetup';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AuditLog": AuditLog,
    "CandidateLogin": CandidateLogin,
    "Certifications": Certifications,
    "ClockIn": ClockIn,
    "Dashboard": Dashboard,
    "DevPanel": DevPanel,
    "Discover": Discover,
    "Events": Events,
    "HRDashboard": HRDashboard,
    "Home": Home,
    "Messages": Messages,
    "OfficerLogin": OfficerLogin,
    "Officers": Officers,
    "Onboarding": Onboarding,
    "SOPs": SOPs,
    "Schedule": Schedule,
    "Settings": Settings,
    "Sites": Sites,
    "Timesheets": Timesheets,
    "Training": Training,
    "WhitelabelSetup": WhitelabelSetup,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};