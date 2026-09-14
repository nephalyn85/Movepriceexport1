import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import App from './App.tsx';
import MovingCalculator from './pages/MovingCalculator.tsx';
import GoRedirect from './pages/GoRedirect.tsx';
import BinRentals from './pages/BinRentals.tsx';
import HourlyMoving from './pages/HourlyMoving.tsx';
import RentATruck from './pages/RentATruck.tsx';
import Blog from './pages/Blog.tsx';
import BlogPost from './pages/BlogPost.tsx';
import BlogAdmin from './pages/BlogAdmin.tsx';
import PrivacyPolicy from './pages/PrivacyPolicy.tsx';
import TermsOfUse from './pages/TermsOfUse.tsx';
import LongDistanceMovingCost from './pages/LongDistanceMovingCost.tsx';
import MoversVsTruckRental from './pages/MoversVsTruckRental.tsx';
import MovingCostByHomeSize from './pages/MovingCostByHomeSize.tsx';
import CheapMovingTruckRentals from './pages/CheapMovingTruckRentals.tsx';
import StateToStateMovingCost from './pages/StateToStateMovingCost.tsx';
import MovingCostByCity from './pages/MovingCostByCity.tsx';
import MovingCostMap from './pages/MovingCostMap.tsx';
import StatMovingCost from './pages/StatMovingCost.tsx';
import InventoryCalculator from './pages/InventoryCalculator.tsx';
import GetQuotes from './pages/GetQuotes.tsx';
import HowMovePriceCalculates from './pages/HowMovePriceCalculates.tsx';
import HowMovingCompaniesCalculate from './pages/HowMovingCompaniesCalculate.tsx';
import ApartmentCheckNYC from './pages/ApartmentCheckNYC.tsx';
import './index.css';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/free-moving-calculator-no-sign-up" element={<MovingCalculator />} />
        <Route path="/bin-rentals" element={<BinRentals />} />
        <Route path="/hourly-moving" element={<HourlyMoving />} />
        <Route path="/rent-a-truck" element={<RentATruck />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/admin/blog" element={<BlogAdmin />} />
        <Route path="/go/:slug" element={<GoRedirect />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-use" element={<TermsOfUse />} />
        <Route path="/long-distance-moving-cost" element={<LongDistanceMovingCost />} />
        <Route path="/movers-vs-truck-rental" element={<MoversVsTruckRental />} />
        <Route path="/moving-cost-by-home-size" element={<MovingCostByHomeSize />} />
        <Route path="/cheap-moving-truck-rentals" element={<CheapMovingTruckRentals />} />
        <Route path="/state-to-state-moving-cost" element={<StateToStateMovingCost />} />
        <Route path="/moving-cost-by-city" element={<MovingCostByCity />} />
        <Route path="/moving-cost/map" element={<MovingCostMap />} />
        <Route path="/moving-cost/state/:slug" element={<StatMovingCost />} />
        <Route path="/inventory-calculator" element={<InventoryCalculator />} />
        <Route path="/get-quotes" element={<GetQuotes />} />
        <Route path="/how-move-price-calculates-long-distance-moving-costs" element={<HowMovePriceCalculates />} />
        <Route path="/how-moving-companies-calculate-long-distance-moving-costs" element={<HowMovingCompaniesCalculate />} />
        <Route path="/apartment-check-nyc" element={<ApartmentCheckNYC />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
