import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, Building2, Plus, Minus, CheckSquare, Square,
  ChevronDown, ChevronUp, Package, Wrench, Warehouse,
  MapPin, Navigation, Calendar, Check, ClipboardList,
  ArrowRight, ArrowLeft, Truck, Clock, DollarSign,
  Users, Scale, Mail, Send, CheckCircle,
  HelpCircle, Database, Box, Ruler, TrendingDown,
} from 'lucide-react';
import Header from '../components/Header';
import Seo from '../components/Seo';
import Footer from '../components/Footer';
import MoveDatePicker from '../components/MoveDatePicker';
import RouteMap from '../components/RouteMap';
import LeadCaptureForm, { type InventoryLineItem } from '../components/LeadCaptureForm';
import PackingServiceOption from '../components/PackingServiceOption';
import ServiceOption from '../components/ServiceOption';
import TruckRentalSnapshot from '../components/TruckRentalSnapshot';
import { supabase } from '../lib/supabase';
import type { StorageUnit } from '../lib/supabase';
import {
  uhaulSizeByHomeSize,
  penskeSizeByHomeSize,
  budgetSizeByHomeSize,
  calcUhaulCosts,
  calcBudgetCosts,
  calcPenskeCosts,
  DEFAULT_DIESEL_PRICE,
} from '../lib/truckRentalPricing';
import { calculatePenskePricing } from '../lib/pricingEngine';
import type { FuelRegion } from '../components/RouteMap';

// ─── Types ────────────────────────────────────────────────────────────────────

type HomeSize = 'studio' | '1br' | '2br' | '3br' | '4br';
type FurnishLevel = 'minimal' | 'average' | 'furnished' | 'heavy';
type PropertyType = 'apartment' | 'house';

interface InventoryItem {
  id: string; room: string; name: string; cubicFeet: number; checked: boolean; qty: number;
}
interface CustomItem { id: string; name: string; cubicFeet: number; qty: number }
interface RoomGroup { room: string; items: { name: string; cubicFeet: number }[] }

interface LocationInfo {
  from: { city: string; state: string; lat: number; lng: number };
  to:   { city: string; state: string; lat: number; lng: number };
  distance: number;
}

interface MoveEstimate {
  low: number; high: number;
  fromZip: string; toZip: string;
  homeSize: string;
  packing: boolean; packingBoxes: number;
  storage: boolean; assembly: boolean;
  distanceMiles: number;
  fromCity: string; fromState: string;
  toCity: string; toState: string;
  moveDate: Date;
  fromStairs: number; toStairs: number;
  isBusyDay: boolean;
  baseLow: number; baseHigh: number;
  packingCost: number; storageCost: number; stairsCost: number;
  peakSurchargeLow: number; peakSurchargeHigh: number;
  storageUnitSize: string; storageUnitDimensions: string;
}

interface InventorySnapshot {
  totalCf: number;    // floored to MIN_STUDIO_CF
  rawCf: number;      // actual checked total before floor
  itemCount: number;
  canonical: string;  // e.g. '2BR'
  homeSize: HomeSize;
  items: InventoryLineItem[];
}

// ─── Pricing constants ────────────────────────────────────────────────────────

const busyDayPrice   = 1.3;
const normalDayPrice = 1;
const pricePerFlight = 20;

const cfRateNormal   = 1.20;
const cfRateBusy     = 1.60;
const cfRateNormalCA = 1.75;
const cfRateBusyCA   = 2.00;
const mileRateLocal  = 2.50;
const mileRateLong   = 3.00;

const distanceTiers = {
  local:        { maxMiles: 50,  pricePerMile: 2   },
  regional:     { maxMiles: 300, pricePerMile: 2.5 },
  longDistance: { maxMiles: 500, pricePerMile: 3   },
};

const eastCoastStates = ['ME','NH','VT','MA','RI','CT','NY','NJ','PA','DE','MD','VA','WV','NC','SC','GA','FL','DC'];
const midWestStates   = ['OH','IN','IL','MI','WI','MN','IA','MO','ND','SD','NE','KS'];
const westStates      = ['TX','OK','NM','AZ','CO','UT','NV','CA'];
const northWestStates = ['WA','OR','ID','MT','WY','AK','HI'];

function getRegionRate(state: string): number {
  const s = state.toUpperCase();
  if (eastCoastStates.includes(s))  return 5.5;
  if (midWestStates.includes(s))    return 6;
  if (westStates.includes(s))       return 6;
  if (northWestStates.includes(s))  return 7;
  return 6;
}

const volumeRanges: Record<string, { low: number; high: number }> = {
  Studio: { low: 250,  high: 450  },
  '1BR':  { low: 500,  high: 800  },
  '2BR':  { low: 800,  high: 1200 },
  '3BR':  { low: 1200, high: 1800 },
  '4BR':  { low: 1800, high: 2400 },
};

const fallbackStorageUnits: StorageUnit[] = [
  { id:'1', size:'Small',  dimensions:"5' x 10'",  max_cu_ft:400,  usable_cu_ft:250,  price:119.25, sort_order:1 },
  { id:'2', size:'Medium', dimensions:"5' x 15'",  max_cu_ft:600,  usable_cu_ft:375,  price:187.80, sort_order:2 },
  { id:'3', size:'Medium', dimensions:"10' x 10'", max_cu_ft:800,  usable_cu_ft:500,  price:251.25, sort_order:3 },
  { id:'4', size:'Large',  dimensions:"10' x 15'", max_cu_ft:1200, usable_cu_ft:750,  price:432.00, sort_order:4 },
  { id:'5', size:'XL',     dimensions:"10' x 20'", max_cu_ft:1600, usable_cu_ft:1000, price:572.40, sort_order:5 },
  { id:'6', size:'XXL',    dimensions:"10' x 30'", max_cu_ft:2400, usable_cu_ft:1500, price:849.60, sort_order:6 },
];

function getStorageUnit(homeSize: string, units: StorageUnit[]) {
  const vol = volumeRanges[homeSize];
  if (!vol) return units[0];
  const avg = (vol.low + vol.high) / 2;
  return units.find(u => u.usable_cu_ft >= avg) ?? units[units.length - 1];
}

// ─── Inventory constants ──────────────────────────────────────────────────────

const HOME_SIZES: { key: HomeSize; label: string; short: string; beds: number; canonical: string }[] = [
  { key:'studio', label:'Studio',     short:'STU', beds:0, canonical:'Studio' },
  { key:'1br',    label:'1 Bedroom',  short:'1BR', beds:1, canonical:'1BR'    },
  { key:'2br',    label:'2 Bedroom',  short:'2BR', beds:2, canonical:'2BR'    },
  { key:'3br',    label:'3 Bedroom',  short:'3BR', beds:3, canonical:'3BR'    },
  { key:'4br',    label:'4 Bedroom',  short:'4+',  beds:4, canonical:'4BR'    },
];

interface FurnishOption { key: FurnishLevel; label: string; multiplier: number; description: string }

const FURNISH_OPTIONS: FurnishOption[] = [
  { key:'minimal',   label:'Minimal',       multiplier:0.75, description:'Just the basics — mattress, a few boxes, IKEA-level furniture' },
  { key:'average',   label:'Average',        multiplier:1.00, description:'Standard furnished home, typical amount of stuff' },
  { key:'furnished', label:'Well Furnished', multiplier:1.25, description:'Full furniture sets, décor, long-time resident feel' },
  { key:'heavy',     label:'Heavy',          multiplier:1.50, description:'Piano, gym equipment, large art, lots of books or collectibles' },
];

const BASE_CF: Record<HomeSize, number> = {
  studio:297, '1br':444, '2br':702, '3br':1009, '4br':1399,
};

// Minimum billable volume = minimal studio (297 × 0.75 ≈ 223 ft³)
const MIN_STUDIO_CF = Math.round(BASE_CF.studio * 0.75);

// Extra cubic feet for garage / patio items not captured in interior BASE_CF.
// BASE_CF is derived from interior sqft only (ACS bedroom ratios × 4.5 ft³/sqft)
// so garage and patio are genuinely additive — but these are conservative averages
// reflecting only what people typically move, not everything they own out there.
const GARAGE_CF: Record<HomeSize, number> = {
  studio: 0, '1br': 40, '2br': 60, '3br': 80, '4br': 100,
};
const PATIO_CF: Record<HomeSize, number> = {
  studio: 20, '1br': 30, '2br': 40, '3br': 55, '4br': 70,
};

const TRUCK_GUIDE = [
  { maxCf:400,  truck:'10 ft truck',     note:'Small cargo van alternative' },
  { maxCf:800,  truck:'15 ft truck',     note:'Most popular for 1–2 BR' },
  { maxCf:1150, truck:'20 ft truck',     note:'Fits full 2–3 BR' },
  { maxCf:1700, truck:'26 ft truck',     note:'Largest consumer truck' },
  { maxCf:9999, truck:'26 ft + trailer', note:'Two loads or tow behind' },
];

function getTruck(cf: number) {
  return TRUCK_GUIDE.find(t => cf <= t.maxCf) ?? TRUCK_GUIDE[TRUCK_GUIDE.length - 1];
}

function cfToCanonicalSize(cf: number): string {
  if (cf <= 450)  return 'Studio';
  if (cf <= 800)  return '1BR';
  if (cf <= 1200) return '2BR';
  if (cf <= 1800) return '3BR';
  return '4BR';
}

// ─── Item lists ───────────────────────────────────────────────────────────────

const ITEMS_BY_SIZE: Record<HomeSize, RoomGroup[]> = {
  studio: [
    { room:'Sleeping Area', items:[
      { name:'Twin bed', cubicFeet:40 }, { name:'Full/Double bed', cubicFeet:60 },
      { name:'Queen bed (frame + mattress)', cubicFeet:65 }, { name:'King bed (frame + mattress)', cubicFeet:70 },
      { name:'Night table', cubicFeet:5 },
      { name:'Dresser, single (3 drawers)', cubicFeet:30 }, { name:'Dresser, double (6 drawers)', cubicFeet:40 }, { name:'Dresser, triple (9 drawers)', cubicFeet:50 },
      { name:'Wardrobe, small', cubicFeet:20 }, { name:'Wardrobe, large', cubicFeet:40 },
      { name:'Chair, boudoir', cubicFeet:10 }, { name:'Chaise lounge', cubicFeet:25 }, { name:'Chest, cedar', cubicFeet:15 },
    ]},
    { room:'Living Area', items:[
      { name:'Loveseat (2-seat)', cubicFeet:30 }, { name:'Sofa, 3-cushion', cubicFeet:35 },
      { name:'Sofa, hide-a-bed', cubicFeet:50 }, { name:'Sofa, sectional', cubicFeet:80 },
      { name:'Chair, overstuffed', cubicFeet:25 }, { name:'Chair, occasional', cubicFeet:15 }, { name:'Chair, rocker', cubicFeet:12 },
      { name:'Coffee table', cubicFeet:12 }, { name:'End table', cubicFeet:5 },
      { name:'TV flat screen (boxed)', cubicFeet:10 },
      { name:'TV stand, small', cubicFeet:10 }, { name:'TV stand, large / media console', cubicFeet:15 },
      { name:'Entertainment center', cubicFeet:35 },
      { name:'Bookcase', cubicFeet:20 }, { name:'Floor lamp', cubicFeet:3 },
    ]},
    { room:'Dining / Kitchen', items:[
      { name:'Kitchen table, small (seats 2)', cubicFeet:10 }, { name:'Kitchen table, medium (seats 4)', cubicFeet:20 },
      { name:'Dining table, medium (seats 4–6)', cubicFeet:30 }, { name:'Dining table, large (seats 6–8)', cubicFeet:45 },
      { name:'Kitchen / dining chair', cubicFeet:5 },
      { name:'Buffet / sideboard', cubicFeet:30 },
      { name:'Microwave', cubicFeet:10 }, { name:'Small appliances', cubicFeet:5 }, { name:'Refrigerator', cubicFeet:40 },
    ]},
    { room:'Home Office', items:[
      { name:'Desk, small', cubicFeet:22 }, { name:'Desk, secretary', cubicFeet:35 }, { name:'Desk chair', cubicFeet:10 },
      { name:'Bookcase', cubicFeet:20 }, { name:'Filing cabinet', cubicFeet:10 },
    ]},
    { room:'Garage', items:[
      { name:'Workbench', cubicFeet:40 }, { name:'Tool chest, small', cubicFeet:15 }, { name:'Tool chest, large', cubicFeet:30 },
      { name:'Shelving unit, metal', cubicFeet:20 }, { name:'Shelving unit, heavy-duty', cubicFeet:35 },
      { name:'Bicycle', cubicFeet:10 }, { name:'Bicycle, adult', cubicFeet:12 },
      { name:'Lawn mower, push', cubicFeet:12 }, { name:'Lawn mower, riding', cubicFeet:50 },
      { name:'Snow blower', cubicFeet:15 }, { name:'Leaf blower', cubicFeet:3 },
      { name:'Power washer', cubicFeet:5 }, { name:'Shop vac', cubicFeet:5 },
      { name:'Ladder, 6 ft step', cubicFeet:8 }, { name:'Ladder, 8 ft step', cubicFeet:10 }, { name:'Extension ladder, 20 ft', cubicFeet:15 },
      { name:'Storage cabinet, metal', cubicFeet:20 }, { name:'Utility cabinet, tall', cubicFeet:30 },
      { name:'Generator, portable', cubicFeet:10 }, { name:'Air compressor', cubicFeet:8 },
      { name:'Wheelbarrow', cubicFeet:10 }, { name:'Hand truck / dolly', cubicFeet:4 },
      { name:'Garden hose (coiled)', cubicFeet:2 }, { name:'Box of tools / hardware', cubicFeet:3 },
    ]},
    { room:'Patio / Outdoor', items:[
      { name:'Patio table, small (seats 2)', cubicFeet:10 }, { name:'Patio table, medium (seats 4)', cubicFeet:20 }, { name:'Patio table, large (seats 6+)', cubicFeet:35 },
      { name:'Patio chair, folding', cubicFeet:3 }, { name:'Patio chair, armchair', cubicFeet:8 }, { name:'Patio chair, Adirondack', cubicFeet:12 },
      { name:'Patio loveseat', cubicFeet:25 }, { name:'Outdoor sofa, 3-seat', cubicFeet:45 }, { name:'Outdoor sectional set', cubicFeet:90 },
      { name:'Chaise lounge, outdoor', cubicFeet:20 }, { name:'Hammock (bagged)', cubicFeet:3 },
      { name:'Patio umbrella', cubicFeet:5 }, { name:'Umbrella base', cubicFeet:4 },
      { name:'Grill, charcoal', cubicFeet:12 }, { name:'Grill, gas (small)', cubicFeet:15 }, { name:'Grill, gas (large)', cubicFeet:25 },
      { name:'Smoker / BBQ pit', cubicFeet:30 }, { name:'Outdoor pizza oven', cubicFeet:20 },
      { name:'Fire pit', cubicFeet:10 }, { name:'Chiminea', cubicFeet:12 },
      { name:'Planter, large', cubicFeet:5 }, { name:'Planter, extra-large', cubicFeet:10 },
      { name:'Garden bench', cubicFeet:12 }, { name:'Swing bench, 2-seat', cubicFeet:20 },
      { name:'Outdoor rug (rolled)', cubicFeet:5 },
      { name:'Storage deck box, small', cubicFeet:10 }, { name:'Storage deck box, large', cubicFeet:20 },
      { name:'Outdoor bar cart', cubicFeet:10 },
      { name:'Kiddie pool (folded)', cubicFeet:3 }, { name:'Above-ground pool (boxed)', cubicFeet:25 },
      { name:'Kayak, 12 ft', cubicFeet:28 }, { name:'Kayak, 14–18 ft', cubicFeet:40 },
      { name:'Trampoline, small', cubicFeet:20 }, { name:'Trampoline, large', cubicFeet:40 },
      { name:'Swing set / playset', cubicFeet:60 },
      { name:'Garden tools (bundled)', cubicFeet:5 },
    ]},
    { room:'Misc', items:[
      { name:'Washer', cubicFeet:28 }, { name:'Dryer', cubicFeet:28 },
      { name:'Vacuum cleaner', cubicFeet:5 }, { name:'Exercise bike', cubicFeet:10 }, { name:'Treadmill', cubicFeet:20 },
      { name:'Bicycle', cubicFeet:10 }, { name:'Ironing board', cubicFeet:2 },
    ]},
    { room:'Boxes', items:[
      { name:'Small box (1.5 ft³)', cubicFeet:1.5 }, { name:'Medium box (3 ft³)', cubicFeet:3 },
      { name:'Large box (5 ft³)', cubicFeet:5 }, { name:'Wardrobe carton', cubicFeet:10 },
    ]},
  ],
  '1br': [
    { room:'Bedroom', items:[
      { name:'Twin bed', cubicFeet:40 }, { name:'Full/Double bed', cubicFeet:60 },
      { name:'Queen bed (frame + mattress)', cubicFeet:65 }, { name:'King bed (frame + mattress)', cubicFeet:70 },
      { name:'Bunk bed set', cubicFeet:70 },
      { name:'Night table', cubicFeet:5 },
      { name:'Dresser, single (3 drawers)', cubicFeet:30 }, { name:'Dresser, double (6 drawers)', cubicFeet:40 }, { name:'Dresser, triple (9 drawers)', cubicFeet:50 },
      { name:'Wardrobe, small', cubicFeet:20 }, { name:'Wardrobe, large', cubicFeet:40 },
      { name:'Chair, boudoir', cubicFeet:10 }, { name:'Chaise lounge', cubicFeet:25 }, { name:'Chest, cedar', cubicFeet:15 },
    ]},
    { room:'Living Room', items:[
      { name:'Loveseat (2-seat)', cubicFeet:30 }, { name:'Sofa, 3-cushion', cubicFeet:35 },
      { name:'Sofa, hide-a-bed', cubicFeet:50 }, { name:'Sofa, sectional', cubicFeet:80 },
      { name:'Chair, overstuffed', cubicFeet:25 }, { name:'Chair, occasional', cubicFeet:15 }, { name:'Chair, rocker', cubicFeet:12 },
      { name:'Coffee table', cubicFeet:12 }, { name:'End table', cubicFeet:5 },
      { name:'TV flat screen (boxed)', cubicFeet:10 },
      { name:'TV stand, small', cubicFeet:10 }, { name:'TV stand, large / media console', cubicFeet:15 },
      { name:'Entertainment center', cubicFeet:35 },
      { name:'Bookcase', cubicFeet:20 }, { name:'Floor lamp', cubicFeet:3 },
    ]},
    { room:'Dining Room', items:[
      { name:'Dining table, small (seats 2–4)', cubicFeet:10 }, { name:'Dining table, medium (seats 4–6)', cubicFeet:30 },
      { name:'Dining table, large (seats 6–8)', cubicFeet:45 },
      { name:'Dining chair', cubicFeet:5 }, { name:'Buffet / sideboard', cubicFeet:30 }, { name:'Hutch (top)', cubicFeet:20 },
    ]},
    { room:'Kitchen', items:[
      { name:'Kitchen table, small (seats 2)', cubicFeet:10 }, { name:'Kitchen table, medium (seats 4)', cubicFeet:20 },
      { name:'Kitchen chair', cubicFeet:5 },
      { name:'Microwave', cubicFeet:10 }, { name:'Small appliances', cubicFeet:8 }, { name:'Refrigerator', cubicFeet:40 },
    ]},
    { room:'Home Office', items:[
      { name:'Desk, small', cubicFeet:22 }, { name:'Desk, secretary', cubicFeet:35 }, { name:'Desk chair', cubicFeet:10 },
      { name:'Bookcase', cubicFeet:20 }, { name:'Filing cabinet', cubicFeet:10 },
    ]},
    { room:'Garage', items:[
      { name:'Workbench', cubicFeet:40 }, { name:'Tool chest, small', cubicFeet:15 }, { name:'Tool chest, large', cubicFeet:30 },
      { name:'Shelving unit, metal', cubicFeet:20 }, { name:'Shelving unit, heavy-duty', cubicFeet:35 },
      { name:'Bicycle', cubicFeet:10 }, { name:'Bicycle, adult', cubicFeet:12 },
      { name:'Lawn mower, push', cubicFeet:12 }, { name:'Lawn mower, riding', cubicFeet:50 },
      { name:'Snow blower', cubicFeet:15 }, { name:'Leaf blower', cubicFeet:3 },
      { name:'Power washer', cubicFeet:5 }, { name:'Shop vac', cubicFeet:5 },
      { name:'Ladder, 6 ft step', cubicFeet:8 }, { name:'Ladder, 8 ft step', cubicFeet:10 }, { name:'Extension ladder, 20 ft', cubicFeet:15 },
      { name:'Storage cabinet, metal', cubicFeet:20 }, { name:'Utility cabinet, tall', cubicFeet:30 },
      { name:'Generator, portable', cubicFeet:10 }, { name:'Air compressor', cubicFeet:8 },
      { name:'Wheelbarrow', cubicFeet:10 }, { name:'Hand truck / dolly', cubicFeet:4 },
      { name:'Garden hose (coiled)', cubicFeet:2 }, { name:'Box of tools / hardware', cubicFeet:3 },
    ]},
    { room:'Patio / Outdoor', items:[
      { name:'Patio table, small (seats 2)', cubicFeet:10 }, { name:'Patio table, medium (seats 4)', cubicFeet:20 }, { name:'Patio table, large (seats 6+)', cubicFeet:35 },
      { name:'Patio chair, folding', cubicFeet:3 }, { name:'Patio chair, armchair', cubicFeet:8 }, { name:'Patio chair, Adirondack', cubicFeet:12 },
      { name:'Patio loveseat', cubicFeet:25 }, { name:'Outdoor sofa, 3-seat', cubicFeet:45 }, { name:'Outdoor sectional set', cubicFeet:90 },
      { name:'Chaise lounge, outdoor', cubicFeet:20 }, { name:'Hammock (bagged)', cubicFeet:3 },
      { name:'Patio umbrella', cubicFeet:5 }, { name:'Umbrella base', cubicFeet:4 },
      { name:'Grill, charcoal', cubicFeet:12 }, { name:'Grill, gas (small)', cubicFeet:15 }, { name:'Grill, gas (large)', cubicFeet:25 },
      { name:'Smoker / BBQ pit', cubicFeet:30 }, { name:'Outdoor pizza oven', cubicFeet:20 },
      { name:'Fire pit', cubicFeet:10 }, { name:'Chiminea', cubicFeet:12 },
      { name:'Planter, large', cubicFeet:5 }, { name:'Planter, extra-large', cubicFeet:10 },
      { name:'Garden bench', cubicFeet:12 }, { name:'Swing bench, 2-seat', cubicFeet:20 },
      { name:'Outdoor rug (rolled)', cubicFeet:5 },
      { name:'Storage deck box, small', cubicFeet:10 }, { name:'Storage deck box, large', cubicFeet:20 },
      { name:'Outdoor bar cart', cubicFeet:10 },
      { name:'Kiddie pool (folded)', cubicFeet:3 }, { name:'Above-ground pool (boxed)', cubicFeet:25 },
      { name:'Kayak, 12 ft', cubicFeet:28 }, { name:'Kayak, 14–18 ft', cubicFeet:40 },
      { name:'Trampoline, small', cubicFeet:20 }, { name:'Trampoline, large', cubicFeet:40 },
      { name:'Swing set / playset', cubicFeet:60 },
      { name:'Garden tools (bundled)', cubicFeet:5 },
    ]},
    { room:'Misc', items:[
      { name:'Washer', cubicFeet:28 }, { name:'Dryer', cubicFeet:28 },
      { name:'Vacuum cleaner', cubicFeet:5 }, { name:'Exercise bike', cubicFeet:10 }, { name:'Treadmill', cubicFeet:20 },
      { name:'Bicycle', cubicFeet:10 }, { name:'Ironing board', cubicFeet:2 },
    ]},
    { room:'Boxes', items:[
      { name:'Small box (1.5 ft³)', cubicFeet:1.5 }, { name:'Medium box (3 ft³)', cubicFeet:3 },
      { name:'Large box (5 ft³)', cubicFeet:5 }, { name:'Wardrobe carton', cubicFeet:10 },
    ]},
  ],
  '2br': [
    { room:'Master Bedroom', items:[
      { name:'Twin bed', cubicFeet:40 }, { name:'Full/Double bed', cubicFeet:60 },
      { name:'Queen bed (frame + mattress)', cubicFeet:65 }, { name:'King bed (frame + mattress)', cubicFeet:70 },
      { name:'Night table', cubicFeet:5 },
      { name:'Dresser, single (3 drawers)', cubicFeet:30 }, { name:'Dresser, double (6 drawers)', cubicFeet:40 }, { name:'Dresser, triple (9 drawers)', cubicFeet:50 },
      { name:'Wardrobe, small', cubicFeet:20 }, { name:'Wardrobe, large', cubicFeet:40 },
      { name:'Chair, boudoir', cubicFeet:10 }, { name:'Chaise lounge', cubicFeet:25 }, { name:'Chest, cedar', cubicFeet:15 },
    ]},
    { room:'Bedroom 2', items:[
      { name:'Twin bed', cubicFeet:40 }, { name:'Full/Double bed', cubicFeet:60 },
      { name:'Queen bed (frame + mattress)', cubicFeet:65 }, { name:'King bed (frame + mattress)', cubicFeet:70 },
      { name:'Bunk bed set', cubicFeet:70 },
      { name:'Night table', cubicFeet:5 },
      { name:'Dresser, single (3 drawers)', cubicFeet:30 }, { name:'Dresser, double (6 drawers)', cubicFeet:40 }, { name:'Dresser, triple (9 drawers)', cubicFeet:50 },
      { name:'Wardrobe, small', cubicFeet:20 }, { name:'Wardrobe, large', cubicFeet:40 },
      { name:'Chair, boudoir', cubicFeet:10 }, { name:'Chaise lounge', cubicFeet:25 }, { name:'Chest, cedar', cubicFeet:15 },
      { name:'Toy chest', cubicFeet:5 }, { name:'Bookcase', cubicFeet:20 },
    ]},
    { room:'Living Room', items:[
      { name:'Loveseat (2-seat)', cubicFeet:30 }, { name:'Sofa, 3-cushion', cubicFeet:35 },
      { name:'Sofa, hide-a-bed', cubicFeet:50 }, { name:'Sofa, sectional', cubicFeet:80 },
      { name:'Chair, overstuffed', cubicFeet:25 }, { name:'Chair, occasional', cubicFeet:15 }, { name:'Chair, rocker', cubicFeet:12 },
      { name:'Coffee table', cubicFeet:12 }, { name:'End table', cubicFeet:5 },
      { name:'TV flat screen (boxed)', cubicFeet:10 },
      { name:'TV stand, small', cubicFeet:10 }, { name:'TV stand, large / media console', cubicFeet:15 },
      { name:'Entertainment center', cubicFeet:35 },
      { name:'Bookcase', cubicFeet:20 }, { name:'Floor lamp', cubicFeet:3 },
    ]},
    { room:'Dining Room', items:[
      { name:'Dining table, small (seats 2–4)', cubicFeet:10 }, { name:'Dining table, medium (seats 4–6)', cubicFeet:30 },
      { name:'Dining table, large (seats 6–8)', cubicFeet:45 },
      { name:'Dining chair', cubicFeet:5 }, { name:'Buffet / sideboard', cubicFeet:30 }, { name:'Hutch (top)', cubicFeet:20 },
    ]},
    { room:'Kitchen', items:[
      { name:'Kitchen table, small (seats 2)', cubicFeet:10 }, { name:'Kitchen table, medium (seats 4)', cubicFeet:20 },
      { name:'Kitchen chair', cubicFeet:5 },
      { name:'Microwave', cubicFeet:10 }, { name:'Small appliances', cubicFeet:10 }, { name:'Refrigerator', cubicFeet:40 },
    ]},
    { room:'Home Office', items:[
      { name:'Desk, small', cubicFeet:22 }, { name:'Desk, secretary', cubicFeet:35 }, { name:'Desk chair', cubicFeet:10 },
      { name:'Bookcase', cubicFeet:20 }, { name:'Filing cabinet', cubicFeet:10 },
    ]},
    { room:'Appliances', items:[
      { name:'Washer', cubicFeet:28 }, { name:'Dryer', cubicFeet:28 }, { name:'Chest freezer', cubicFeet:25 },
    ]},
    { room:'Misc', items:[
      { name:'Vacuum cleaner', cubicFeet:5 }, { name:'Exercise bike', cubicFeet:10 }, { name:'Treadmill', cubicFeet:20 },
      { name:'Bicycle', cubicFeet:10 }, { name:'Ironing board', cubicFeet:2 },
    ]},
    { room:'Garage', items:[
      { name:'Workbench', cubicFeet:40 }, { name:'Tool chest, small', cubicFeet:15 }, { name:'Tool chest, large', cubicFeet:30 },
      { name:'Shelving unit, metal', cubicFeet:20 }, { name:'Shelving unit, heavy-duty', cubicFeet:35 },
      { name:'Bicycle', cubicFeet:10 }, { name:'Bicycle, adult', cubicFeet:12 },
      { name:'Lawn mower, push', cubicFeet:12 }, { name:'Lawn mower, riding', cubicFeet:50 },
      { name:'Snow blower', cubicFeet:15 }, { name:'Leaf blower', cubicFeet:3 },
      { name:'Power washer', cubicFeet:5 }, { name:'Shop vac', cubicFeet:5 },
      { name:'Ladder, 6 ft step', cubicFeet:8 }, { name:'Ladder, 8 ft step', cubicFeet:10 }, { name:'Extension ladder, 20 ft', cubicFeet:15 },
      { name:'Storage cabinet, metal', cubicFeet:20 }, { name:'Utility cabinet, tall', cubicFeet:30 },
      { name:'Generator, portable', cubicFeet:10 }, { name:'Air compressor', cubicFeet:8 },
      { name:'Wheelbarrow', cubicFeet:10 }, { name:'Hand truck / dolly', cubicFeet:4 },
      { name:'Garden hose (coiled)', cubicFeet:2 }, { name:'Box of tools / hardware', cubicFeet:3 },
    ]},
    { room:'Patio / Outdoor', items:[
      { name:'Patio table, small (seats 2)', cubicFeet:10 }, { name:'Patio table, medium (seats 4)', cubicFeet:20 }, { name:'Patio table, large (seats 6+)', cubicFeet:35 },
      { name:'Patio chair, folding', cubicFeet:3 }, { name:'Patio chair, armchair', cubicFeet:8 }, { name:'Patio chair, Adirondack', cubicFeet:12 },
      { name:'Patio loveseat', cubicFeet:25 }, { name:'Outdoor sofa, 3-seat', cubicFeet:45 }, { name:'Outdoor sectional set', cubicFeet:90 },
      { name:'Chaise lounge, outdoor', cubicFeet:20 }, { name:'Hammock (bagged)', cubicFeet:3 },
      { name:'Patio umbrella', cubicFeet:5 }, { name:'Umbrella base', cubicFeet:4 },
      { name:'Grill, charcoal', cubicFeet:12 }, { name:'Grill, gas (small)', cubicFeet:15 }, { name:'Grill, gas (large)', cubicFeet:25 },
      { name:'Smoker / BBQ pit', cubicFeet:30 }, { name:'Outdoor pizza oven', cubicFeet:20 },
      { name:'Fire pit', cubicFeet:10 }, { name:'Chiminea', cubicFeet:12 },
      { name:'Planter, large', cubicFeet:5 }, { name:'Planter, extra-large', cubicFeet:10 },
      { name:'Garden bench', cubicFeet:12 }, { name:'Swing bench, 2-seat', cubicFeet:20 },
      { name:'Outdoor rug (rolled)', cubicFeet:5 },
      { name:'Storage deck box, small', cubicFeet:10 }, { name:'Storage deck box, large', cubicFeet:20 },
      { name:'Outdoor bar cart', cubicFeet:10 },
      { name:'Kiddie pool (folded)', cubicFeet:3 }, { name:'Above-ground pool (boxed)', cubicFeet:25 },
      { name:'Kayak, 12 ft', cubicFeet:28 }, { name:'Kayak, 14–18 ft', cubicFeet:40 },
      { name:'Trampoline, small', cubicFeet:20 }, { name:'Trampoline, large', cubicFeet:40 },
      { name:'Swing set / playset', cubicFeet:60 },
      { name:'Garden tools (bundled)', cubicFeet:5 },
    ]},
    { room:'Boxes', items:[
      { name:'Small box (1.5 ft³)', cubicFeet:1.5 }, { name:'Medium box (3 ft³)', cubicFeet:3 },
      { name:'Large box (5 ft³)', cubicFeet:5 }, { name:'Wardrobe carton', cubicFeet:10 },
    ]},
  ],
  '3br': [
    { room:'Master Bedroom', items:[
      { name:'Twin bed', cubicFeet:40 }, { name:'Full/Double bed', cubicFeet:60 },
      { name:'Queen bed (frame + mattress)', cubicFeet:65 }, { name:'King bed (frame + mattress)', cubicFeet:70 },
      { name:'Night table', cubicFeet:5 },
      { name:'Dresser, single (3 drawers)', cubicFeet:30 }, { name:'Dresser, double (6 drawers)', cubicFeet:40 }, { name:'Dresser, triple (9 drawers)', cubicFeet:50 },
      { name:'Wardrobe, small', cubicFeet:20 }, { name:'Wardrobe, large', cubicFeet:40 },
      { name:'Chair, boudoir', cubicFeet:10 }, { name:'Chaise lounge', cubicFeet:25 }, { name:'Chest, cedar', cubicFeet:15 },
    ]},
    { room:'Bedroom 2', items:[
      { name:'Twin bed', cubicFeet:40 }, { name:'Full/Double bed', cubicFeet:60 },
      { name:'Queen bed (frame + mattress)', cubicFeet:65 }, { name:'King bed (frame + mattress)', cubicFeet:70 },
      { name:'Bunk bed set', cubicFeet:70 },
      { name:'Night table', cubicFeet:5 },
      { name:'Dresser, single (3 drawers)', cubicFeet:30 }, { name:'Dresser, double (6 drawers)', cubicFeet:40 }, { name:'Dresser, triple (9 drawers)', cubicFeet:50 },
      { name:'Wardrobe, small', cubicFeet:20 }, { name:'Wardrobe, large', cubicFeet:40 },
      { name:'Chair, boudoir', cubicFeet:10 }, { name:'Chaise lounge', cubicFeet:25 }, { name:'Chest, cedar', cubicFeet:15 },
      { name:'Toy chest', cubicFeet:5 }, { name:'Bookcase', cubicFeet:20 },
    ]},
    { room:'Bedroom 3', items:[
      { name:'Twin bed', cubicFeet:40 }, { name:'Full/Double bed', cubicFeet:60 },
      { name:'Queen bed (frame + mattress)', cubicFeet:65 }, { name:'King bed (frame + mattress)', cubicFeet:70 },
      { name:'Bunk bed set', cubicFeet:70 },
      { name:'Night table', cubicFeet:5 },
      { name:'Dresser, single (3 drawers)', cubicFeet:30 }, { name:'Dresser, double (6 drawers)', cubicFeet:40 }, { name:'Dresser, triple (9 drawers)', cubicFeet:50 },
      { name:'Wardrobe, small', cubicFeet:20 }, { name:'Wardrobe, large', cubicFeet:40 },
      { name:'Chair, boudoir', cubicFeet:10 }, { name:'Chaise lounge', cubicFeet:25 },
      { name:'Toy chest', cubicFeet:5 }, { name:'Bookcase', cubicFeet:20 },
    ]},
    { room:'Living Room', items:[
      { name:'Loveseat (2-seat)', cubicFeet:30 }, { name:'Sofa, 3-cushion', cubicFeet:35 },
      { name:'Sofa, hide-a-bed', cubicFeet:50 }, { name:'Sofa, sectional', cubicFeet:80 },
      { name:'Chair, overstuffed', cubicFeet:25 }, { name:'Chair, occasional', cubicFeet:15 }, { name:'Chair, rocker', cubicFeet:12 },
      { name:'Coffee table', cubicFeet:12 }, { name:'End table', cubicFeet:5 },
      { name:'TV flat screen (boxed)', cubicFeet:10 },
      { name:'TV stand, small', cubicFeet:10 }, { name:'TV stand, large / media console', cubicFeet:15 },
      { name:'Entertainment center', cubicFeet:35 },
      { name:'Bookcase', cubicFeet:20 }, { name:'Floor lamp', cubicFeet:3 },
    ]},
    { room:'Dining Room', items:[
      { name:'Dining table, small (seats 2–4)', cubicFeet:10 }, { name:'Dining table, medium (seats 4–6)', cubicFeet:30 },
      { name:'Dining table, large (seats 6–8)', cubicFeet:45 },
      { name:'Dining chair', cubicFeet:5 }, { name:'Buffet / sideboard', cubicFeet:30 }, { name:'Hutch (top)', cubicFeet:20 },
    ]},
    { room:'Kitchen', items:[
      { name:'Kitchen table, small (seats 2)', cubicFeet:10 }, { name:'Kitchen table, medium (seats 4)', cubicFeet:20 },
      { name:'Kitchen chair', cubicFeet:5 },
      { name:'Microwave', cubicFeet:10 }, { name:'Small appliances', cubicFeet:12 }, { name:'Refrigerator', cubicFeet:40 },
    ]},
    { room:'Home Office', items:[
      { name:'Desk, small', cubicFeet:22 }, { name:'Desk, secretary', cubicFeet:35 }, { name:'Desk chair', cubicFeet:10 },
      { name:'Bookcase', cubicFeet:20 }, { name:'Filing cabinet', cubicFeet:10 },
    ]},
    { room:'Appliances', items:[
      { name:'Washer', cubicFeet:28 }, { name:'Dryer', cubicFeet:28 }, { name:'Chest freezer', cubicFeet:25 },
    ]},
    { room:'Misc', items:[
      { name:'Vacuum cleaner', cubicFeet:5 }, { name:'Exercise bike', cubicFeet:10 }, { name:'Treadmill', cubicFeet:20 },
      { name:'Bicycle', cubicFeet:10 }, { name:'Ironing board', cubicFeet:2 },
    ]},
    { room:'Garage', items:[
      { name:'Workbench', cubicFeet:40 }, { name:'Tool chest, small', cubicFeet:15 }, { name:'Tool chest, large', cubicFeet:30 },
      { name:'Shelving unit, metal', cubicFeet:20 }, { name:'Shelving unit, heavy-duty', cubicFeet:35 },
      { name:'Bicycle', cubicFeet:10 }, { name:'Bicycle, adult', cubicFeet:12 },
      { name:'Lawn mower, push', cubicFeet:12 }, { name:'Lawn mower, riding', cubicFeet:50 },
      { name:'Snow blower', cubicFeet:15 }, { name:'Leaf blower', cubicFeet:3 },
      { name:'Power washer', cubicFeet:5 }, { name:'Shop vac', cubicFeet:5 },
      { name:'Ladder, 6 ft step', cubicFeet:8 }, { name:'Ladder, 8 ft step', cubicFeet:10 }, { name:'Extension ladder, 20 ft', cubicFeet:15 },
      { name:'Storage cabinet, metal', cubicFeet:20 }, { name:'Utility cabinet, tall', cubicFeet:30 },
      { name:'Generator, portable', cubicFeet:10 }, { name:'Air compressor', cubicFeet:8 },
      { name:'Wheelbarrow', cubicFeet:10 }, { name:'Hand truck / dolly', cubicFeet:4 },
      { name:'Garden hose (coiled)', cubicFeet:2 }, { name:'Box of tools / hardware', cubicFeet:3 },
    ]},
    { room:'Patio / Outdoor', items:[
      { name:'Patio table, small (seats 2)', cubicFeet:10 }, { name:'Patio table, medium (seats 4)', cubicFeet:20 }, { name:'Patio table, large (seats 6+)', cubicFeet:35 },
      { name:'Patio chair, folding', cubicFeet:3 }, { name:'Patio chair, armchair', cubicFeet:8 }, { name:'Patio chair, Adirondack', cubicFeet:12 },
      { name:'Patio loveseat', cubicFeet:25 }, { name:'Outdoor sofa, 3-seat', cubicFeet:45 }, { name:'Outdoor sectional set', cubicFeet:90 },
      { name:'Chaise lounge, outdoor', cubicFeet:20 }, { name:'Hammock (bagged)', cubicFeet:3 },
      { name:'Patio umbrella', cubicFeet:5 }, { name:'Umbrella base', cubicFeet:4 },
      { name:'Grill, charcoal', cubicFeet:12 }, { name:'Grill, gas (small)', cubicFeet:15 }, { name:'Grill, gas (large)', cubicFeet:25 },
      { name:'Smoker / BBQ pit', cubicFeet:30 }, { name:'Outdoor pizza oven', cubicFeet:20 },
      { name:'Fire pit', cubicFeet:10 }, { name:'Chiminea', cubicFeet:12 },
      { name:'Planter, large', cubicFeet:5 }, { name:'Planter, extra-large', cubicFeet:10 },
      { name:'Garden bench', cubicFeet:12 }, { name:'Swing bench, 2-seat', cubicFeet:20 },
      { name:'Outdoor rug (rolled)', cubicFeet:5 },
      { name:'Storage deck box, small', cubicFeet:10 }, { name:'Storage deck box, large', cubicFeet:20 },
      { name:'Outdoor bar cart', cubicFeet:10 },
      { name:'Kiddie pool (folded)', cubicFeet:3 }, { name:'Above-ground pool (boxed)', cubicFeet:25 },
      { name:'Kayak, 12 ft', cubicFeet:28 }, { name:'Kayak, 14–18 ft', cubicFeet:40 },
      { name:'Trampoline, small', cubicFeet:20 }, { name:'Trampoline, large', cubicFeet:40 },
      { name:'Swing set / playset', cubicFeet:60 },
      { name:'Garden tools (bundled)', cubicFeet:5 },
    ]},
    { room:'Boxes', items:[
      { name:'Small box (1.5 ft³)', cubicFeet:1.5 }, { name:'Medium box (3 ft³)', cubicFeet:3 },
      { name:'Large box (5 ft³)', cubicFeet:5 }, { name:'Wardrobe carton', cubicFeet:10 },
    ]},
  ],
  '4br': [
    { room:'Master Bedroom', items:[
      { name:'Twin bed', cubicFeet:40 }, { name:'Full/Double bed', cubicFeet:60 },
      { name:'Queen bed (frame + mattress)', cubicFeet:65 }, { name:'King bed (frame + mattress)', cubicFeet:70 },
      { name:'Night table', cubicFeet:5 },
      { name:'Dresser, single (3 drawers)', cubicFeet:30 }, { name:'Dresser, double (6 drawers)', cubicFeet:40 }, { name:'Dresser, triple (9 drawers)', cubicFeet:50 },
      { name:'Wardrobe, small', cubicFeet:20 }, { name:'Wardrobe, large', cubicFeet:40 },
      { name:'Chair, boudoir', cubicFeet:10 }, { name:'Chaise lounge', cubicFeet:25 }, { name:'Chest, cedar', cubicFeet:15 },
    ]},
    { room:'Bedroom 2', items:[
      { name:'Twin bed', cubicFeet:40 }, { name:'Full/Double bed', cubicFeet:60 },
      { name:'Queen bed (frame + mattress)', cubicFeet:65 }, { name:'King bed (frame + mattress)', cubicFeet:70 },
      { name:'Bunk bed set', cubicFeet:70 },
      { name:'Night table', cubicFeet:5 },
      { name:'Dresser, single (3 drawers)', cubicFeet:30 }, { name:'Dresser, double (6 drawers)', cubicFeet:40 }, { name:'Dresser, triple (9 drawers)', cubicFeet:50 },
      { name:'Wardrobe, small', cubicFeet:20 }, { name:'Wardrobe, large', cubicFeet:40 },
      { name:'Chair, boudoir', cubicFeet:10 }, { name:'Chaise lounge', cubicFeet:25 }, { name:'Chest, cedar', cubicFeet:15 },
      { name:'Toy chest', cubicFeet:5 }, { name:'Bookcase', cubicFeet:20 },
    ]},
    { room:'Bedroom 3', items:[
      { name:'Twin bed', cubicFeet:40 }, { name:'Full/Double bed', cubicFeet:60 },
      { name:'Queen bed (frame + mattress)', cubicFeet:65 }, { name:'King bed (frame + mattress)', cubicFeet:70 },
      { name:'Bunk bed set', cubicFeet:70 },
      { name:'Night table', cubicFeet:5 },
      { name:'Dresser, single (3 drawers)', cubicFeet:30 }, { name:'Dresser, double (6 drawers)', cubicFeet:40 }, { name:'Dresser, triple (9 drawers)', cubicFeet:50 },
      { name:'Wardrobe, small', cubicFeet:20 }, { name:'Wardrobe, large', cubicFeet:40 },
      { name:'Chair, boudoir', cubicFeet:10 }, { name:'Chaise lounge', cubicFeet:25 }, { name:'Chest, cedar', cubicFeet:15 },
      { name:'Toy chest', cubicFeet:5 }, { name:'Bookcase', cubicFeet:20 },
    ]},
    { room:'Bedroom 4', items:[
      { name:'Twin bed', cubicFeet:40 }, { name:'Full/Double bed', cubicFeet:60 },
      { name:'Queen bed (frame + mattress)', cubicFeet:65 }, { name:'King bed (frame + mattress)', cubicFeet:70 },
      { name:'Bunk bed set', cubicFeet:70 },
      { name:'Night table', cubicFeet:5 },
      { name:'Dresser, single (3 drawers)', cubicFeet:30 }, { name:'Dresser, double (6 drawers)', cubicFeet:40 }, { name:'Dresser, triple (9 drawers)', cubicFeet:50 },
      { name:'Wardrobe, small', cubicFeet:20 }, { name:'Wardrobe, large', cubicFeet:40 },
      { name:'Chair, boudoir', cubicFeet:10 }, { name:'Chaise lounge', cubicFeet:25 },
      { name:'Toy chest', cubicFeet:5 }, { name:'Bookcase', cubicFeet:20 },
    ]},
    { room:'Living Room', items:[
      { name:'Loveseat (2-seat)', cubicFeet:30 }, { name:'Sofa, 3-cushion', cubicFeet:35 },
      { name:'Sofa, hide-a-bed', cubicFeet:50 }, { name:'Sofa, sectional', cubicFeet:80 },
      { name:'Chair, overstuffed', cubicFeet:25 }, { name:'Chair, occasional', cubicFeet:15 }, { name:'Chair, rocker', cubicFeet:12 },
      { name:'Coffee table', cubicFeet:12 }, { name:'End table', cubicFeet:5 },
      { name:'TV flat screen (boxed)', cubicFeet:10 },
      { name:'TV stand, small', cubicFeet:10 }, { name:'TV stand, large / media console', cubicFeet:15 },
      { name:'Entertainment center', cubicFeet:35 },
      { name:'Bookcase', cubicFeet:20 }, { name:'Floor lamp', cubicFeet:3 },
    ]},
    { room:'Family Room', items:[
      { name:'Loveseat (2-seat)', cubicFeet:30 }, { name:'Sofa, 3-cushion', cubicFeet:35 },
      { name:'Sofa, hide-a-bed', cubicFeet:50 }, { name:'Sofa, sectional', cubicFeet:80 },
      { name:'Chair, overstuffed', cubicFeet:25 }, { name:'Chair, occasional', cubicFeet:15 }, { name:'Chair, rocker', cubicFeet:12 },
      { name:'Coffee table', cubicFeet:12 }, { name:'End table', cubicFeet:5 },
      { name:'TV flat screen (boxed)', cubicFeet:10 },
      { name:'TV stand, small', cubicFeet:10 }, { name:'TV stand, large / media console', cubicFeet:15 },
      { name:'Entertainment center', cubicFeet:35 },
      { name:'Bookcase', cubicFeet:20 }, { name:'Floor lamp', cubicFeet:3 },
    ]},
    { room:'Dining Room', items:[
      { name:'Dining table, small (seats 2–4)', cubicFeet:10 }, { name:'Dining table, medium (seats 4–6)', cubicFeet:30 },
      { name:'Dining table, large (seats 6–8)', cubicFeet:45 },
      { name:'Dining chair', cubicFeet:5 }, { name:'Buffet / sideboard', cubicFeet:30 }, { name:'Hutch (top)', cubicFeet:20 },
    ]},
    { room:'Kitchen', items:[
      { name:'Kitchen table, small (seats 2)', cubicFeet:10 }, { name:'Kitchen table, medium (seats 4)', cubicFeet:20 },
      { name:'Kitchen chair', cubicFeet:5 },
      { name:'Microwave', cubicFeet:10 }, { name:'Small appliances', cubicFeet:15 }, { name:'Refrigerator', cubicFeet:40 },
    ]},
    { room:'Home Office', items:[
      { name:'Desk, small', cubicFeet:22 }, { name:'Desk, secretary', cubicFeet:35 }, { name:'Desk chair', cubicFeet:10 },
      { name:'Bookcase', cubicFeet:20 }, { name:'Filing cabinet', cubicFeet:10 },
    ]},
    { room:'Appliances', items:[
      { name:'Washer', cubicFeet:28 }, { name:'Dryer', cubicFeet:28 }, { name:'Chest freezer', cubicFeet:25 },
    ]},
    { room:'Misc', items:[
      { name:'Vacuum cleaner', cubicFeet:5 }, { name:'Exercise bike', cubicFeet:10 }, { name:'Treadmill', cubicFeet:20 },
      { name:'Bicycle', cubicFeet:10 }, { name:'Chest, cedar', cubicFeet:15 }, { name:'Ironing board', cubicFeet:2 },
    ]},
    { room:'Garage', items:[
      { name:'Workbench', cubicFeet:40 }, { name:'Tool chest, small', cubicFeet:15 }, { name:'Tool chest, large', cubicFeet:30 },
      { name:'Shelving unit, metal', cubicFeet:20 }, { name:'Shelving unit, heavy-duty', cubicFeet:35 },
      { name:'Bicycle', cubicFeet:10 }, { name:'Bicycle, adult', cubicFeet:12 },
      { name:'Lawn mower, push', cubicFeet:12 }, { name:'Lawn mower, riding', cubicFeet:50 },
      { name:'Snow blower', cubicFeet:15 }, { name:'Leaf blower', cubicFeet:3 },
      { name:'Power washer', cubicFeet:5 }, { name:'Shop vac', cubicFeet:5 },
      { name:'Ladder, 6 ft step', cubicFeet:8 }, { name:'Ladder, 8 ft step', cubicFeet:10 }, { name:'Extension ladder, 20 ft', cubicFeet:15 },
      { name:'Storage cabinet, metal', cubicFeet:20 }, { name:'Utility cabinet, tall', cubicFeet:30 },
      { name:'Generator, portable', cubicFeet:10 }, { name:'Air compressor', cubicFeet:8 },
      { name:'Wheelbarrow', cubicFeet:10 }, { name:'Hand truck / dolly', cubicFeet:4 },
      { name:'Garden hose (coiled)', cubicFeet:2 }, { name:'Box of tools / hardware', cubicFeet:3 },
    ]},
    { room:'Patio / Outdoor', items:[
      { name:'Patio table, small (seats 2)', cubicFeet:10 }, { name:'Patio table, medium (seats 4)', cubicFeet:20 }, { name:'Patio table, large (seats 6+)', cubicFeet:35 },
      { name:'Patio chair, folding', cubicFeet:3 }, { name:'Patio chair, armchair', cubicFeet:8 }, { name:'Patio chair, Adirondack', cubicFeet:12 },
      { name:'Patio loveseat', cubicFeet:25 }, { name:'Outdoor sofa, 3-seat', cubicFeet:45 }, { name:'Outdoor sectional set', cubicFeet:90 },
      { name:'Chaise lounge, outdoor', cubicFeet:20 }, { name:'Hammock (bagged)', cubicFeet:3 },
      { name:'Patio umbrella', cubicFeet:5 }, { name:'Umbrella base', cubicFeet:4 },
      { name:'Grill, charcoal', cubicFeet:12 }, { name:'Grill, gas (small)', cubicFeet:15 }, { name:'Grill, gas (large)', cubicFeet:25 },
      { name:'Smoker / BBQ pit', cubicFeet:30 }, { name:'Outdoor pizza oven', cubicFeet:20 },
      { name:'Fire pit', cubicFeet:10 }, { name:'Chiminea', cubicFeet:12 },
      { name:'Planter, large', cubicFeet:5 }, { name:'Planter, extra-large', cubicFeet:10 },
      { name:'Garden bench', cubicFeet:12 }, { name:'Swing bench, 2-seat', cubicFeet:20 },
      { name:'Outdoor rug (rolled)', cubicFeet:5 },
      { name:'Storage deck box, small', cubicFeet:10 }, { name:'Storage deck box, large', cubicFeet:20 },
      { name:'Outdoor bar cart', cubicFeet:10 },
      { name:'Kiddie pool (folded)', cubicFeet:3 }, { name:'Above-ground pool (boxed)', cubicFeet:25 },
      { name:'Kayak, 12 ft', cubicFeet:28 }, { name:'Kayak, 14–18 ft', cubicFeet:40 },
      { name:'Trampoline, small', cubicFeet:20 }, { name:'Trampoline, large', cubicFeet:40 },
      { name:'Swing set / playset', cubicFeet:60 },
      { name:'Garden tools (bundled)', cubicFeet:5 },
    ]},
    { room:'Boxes', items:[
      { name:'Small box (1.5 ft³)', cubicFeet:1.5 }, { name:'Medium box (3 ft³)', cubicFeet:3 },
      { name:'Large box (5 ft³)', cubicFeet:5 }, { name:'Wardrobe carton', cubicFeet:10 },
    ]},
  ],
};

const ALL_ROOMS_FLAT: RoomGroup[] = [
  { room:'Bedroom', items:[
    { name:'Twin bed', cubicFeet:40 }, { name:'Full/Double bed', cubicFeet:60 },
    { name:'Queen bed (frame + mattress)', cubicFeet:65 }, { name:'King bed (frame + mattress)', cubicFeet:70 },
    { name:'Bunk bed set', cubicFeet:70 },
    { name:'Night table', cubicFeet:5 },
    { name:'Dresser, single (3 drawers)', cubicFeet:30 }, { name:'Dresser, double (6 drawers)', cubicFeet:40 }, { name:'Dresser, triple (9 drawers)', cubicFeet:50 },
    { name:'Wardrobe, small', cubicFeet:20 }, { name:'Wardrobe, large', cubicFeet:40 },
    { name:'Chair, boudoir', cubicFeet:10 }, { name:'Chaise lounge', cubicFeet:25 }, { name:'Chest, cedar', cubicFeet:15 },
  ]},
  { room:'Living Room', items:[
    { name:'Loveseat (2-seat)', cubicFeet:30 }, { name:'Sofa, 3-cushion', cubicFeet:35 },
    { name:'Sofa, hide-a-bed', cubicFeet:50 }, { name:'Sofa, sectional', cubicFeet:80 },
    { name:'Chair, overstuffed', cubicFeet:25 }, { name:'Chair, occasional', cubicFeet:15 }, { name:'Chair, rocker', cubicFeet:12 },
    { name:'Coffee table', cubicFeet:12 }, { name:'End table', cubicFeet:5 }, { name:'TV flat screen (boxed)', cubicFeet:10 },
    { name:'TV stand, small', cubicFeet:10 }, { name:'TV stand, large / media console', cubicFeet:15 },
    { name:'Entertainment center', cubicFeet:35 },
    { name:'Bookcase', cubicFeet:20 }, { name:'Floor lamp', cubicFeet:3 },
  ]},
  { room:'Dining Room', items:[
    { name:'Dining table, small (seats 2–4)', cubicFeet:10 }, { name:'Dining table, medium (seats 4–6)', cubicFeet:30 },
    { name:'Dining table, large (seats 6–8)', cubicFeet:45 }, { name:'Dining chair', cubicFeet:5 },
    { name:'Buffet / sideboard', cubicFeet:30 }, { name:'Hutch (top)', cubicFeet:20 },
  ]},
  { room:'Kitchen', items:[
    { name:'Microwave', cubicFeet:10 }, { name:'Kitchen table', cubicFeet:10 }, { name:'Kitchen chair', cubicFeet:5 },
    { name:'Small appliances', cubicFeet:5 }, { name:'Refrigerator', cubicFeet:40 },
  ]},
  { room:'Home Office', items:[
    { name:'Desk, small', cubicFeet:22 }, { name:'Desk, secretary', cubicFeet:35 }, { name:'Desk chair', cubicFeet:10 },
    { name:'Filing cabinet', cubicFeet:10 }, { name:'Bookcase', cubicFeet:20 },
  ]},
  { room:'Appliances', items:[
    { name:'Washer', cubicFeet:28 }, { name:'Dryer', cubicFeet:28 }, { name:'Chest freezer', cubicFeet:25 },
  ]},
  { room:'Misc', items:[
    { name:'Vacuum cleaner', cubicFeet:5 }, { name:'Exercise bike', cubicFeet:10 }, { name:'Treadmill', cubicFeet:20 },
    { name:'Bicycle', cubicFeet:10 }, { name:'Toy chest', cubicFeet:5 }, { name:'Ironing board', cubicFeet:2 },
  ]},
  { room:'Garage', items:[
    { name:'Workbench', cubicFeet:40 }, { name:'Tool chest, small', cubicFeet:15 }, { name:'Tool chest, large', cubicFeet:30 },
    { name:'Shelving unit, metal', cubicFeet:20 }, { name:'Shelving unit, heavy-duty', cubicFeet:35 },
    { name:'Bicycle', cubicFeet:10 }, { name:'Bicycle, adult', cubicFeet:12 },
    { name:'Lawn mower, push', cubicFeet:12 }, { name:'Lawn mower, riding', cubicFeet:50 },
    { name:'Snow blower', cubicFeet:15 }, { name:'Leaf blower', cubicFeet:3 },
    { name:'Power washer', cubicFeet:5 }, { name:'Shop vac', cubicFeet:5 },
    { name:'Ladder, 6 ft step', cubicFeet:8 }, { name:'Ladder, 8 ft step', cubicFeet:10 }, { name:'Extension ladder, 20 ft', cubicFeet:15 },
    { name:'Storage cabinet, metal', cubicFeet:20 }, { name:'Utility cabinet, tall', cubicFeet:30 },
    { name:'Generator, portable', cubicFeet:10 }, { name:'Air compressor', cubicFeet:8 },
    { name:'Wheelbarrow', cubicFeet:10 }, { name:'Hand truck / dolly', cubicFeet:4 },
    { name:'Garden hose (coiled)', cubicFeet:2 }, { name:'Box of tools / hardware', cubicFeet:3 },
  ]},
  { room:'Patio / Outdoor', items:[
    { name:'Patio table, small (seats 2)', cubicFeet:10 }, { name:'Patio table, medium (seats 4)', cubicFeet:20 }, { name:'Patio table, large (seats 6+)', cubicFeet:35 },
    { name:'Patio chair, folding', cubicFeet:3 }, { name:'Patio chair, armchair', cubicFeet:8 }, { name:'Patio chair, Adirondack', cubicFeet:12 },
    { name:'Patio loveseat', cubicFeet:25 }, { name:'Outdoor sofa, 3-seat', cubicFeet:45 }, { name:'Outdoor sectional set', cubicFeet:90 },
    { name:'Chaise lounge, outdoor', cubicFeet:20 }, { name:'Hammock (bagged)', cubicFeet:3 },
    { name:'Patio umbrella', cubicFeet:5 }, { name:'Umbrella base', cubicFeet:4 },
    { name:'Grill, charcoal', cubicFeet:12 }, { name:'Grill, gas (small)', cubicFeet:15 }, { name:'Grill, gas (large)', cubicFeet:25 },
    { name:'Smoker / BBQ pit', cubicFeet:30 }, { name:'Outdoor pizza oven', cubicFeet:20 },
    { name:'Fire pit', cubicFeet:10 }, { name:'Chiminea', cubicFeet:12 },
    { name:'Planter, large', cubicFeet:5 }, { name:'Planter, extra-large', cubicFeet:10 },
    { name:'Garden bench', cubicFeet:12 }, { name:'Swing bench, 2-seat', cubicFeet:20 },
    { name:'Outdoor rug (rolled)', cubicFeet:5 },
    { name:'Storage deck box, small', cubicFeet:10 }, { name:'Storage deck box, large', cubicFeet:20 },
    { name:'Outdoor bar cart', cubicFeet:10 },
    { name:'Kiddie pool (folded)', cubicFeet:3 }, { name:'Above-ground pool (boxed)', cubicFeet:25 },
    { name:'Trampoline, small', cubicFeet:20 }, { name:'Trampoline, large', cubicFeet:40 },
    { name:'Swing set / playset', cubicFeet:60 },
    { name:'Garden tools (bundled)', cubicFeet:5 },
  ]},
  { room:'Boxes', items:[
    { name:'Small box (1.5 ft³)', cubicFeet:1.5 }, { name:'Medium box (3 ft³)', cubicFeet:3 },
    { name:'Large box (5 ft³)', cubicFeet:5 }, { name:'Wardrobe carton', cubicFeet:10 },
  ]},
];

function makeItemList(groups: RoomGroup[]): InventoryItem[] {
  return groups.flatMap((g, gi) =>
    g.items.map((item, ii) => ({
      id: `${gi}-${ii}`, room: g.room, name: item.name,
      cubicFeet: item.cubicFeet, checked: false, qty: 1,
    }))
  );
}

// ─── StairsIcon ───────────────────────────────────────────────────────────────

function StairsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 22h5v-5h5v-5h5v-5h5" />
    </svg>
  );
}

// ─── Loading Overlay ──────────────────────────────────────────────────────────

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-10 shadow-2xl flex flex-col items-center gap-6 max-w-sm mx-4">
        <div className="relative">
          <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/30">
            <Truck className="w-10 h-10 text-white animate-bounce" />
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {[0, 200, 400].map(d => (
              <div key={d} className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold text-slate-900 mb-2">Calculating Your Estimate</h3>
          <p className="text-slate-500">Analyzing distance, services, and rates...</p>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full animate-[loading_2s_ease-in-out]" />
        </div>
      </div>
    </div>
  );
}

// ─── Shared ZIP + distance hook ───────────────────────────────────────────────

function useDistanceLookup() {
  const [fromZip, setFromZip]           = useState('');
  const [toZip, setToZip]               = useState('');
  const [fromStairs, setFromStairs]     = useState(0);
  const [toStairs, setToStairs]         = useState(0);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [avgDiesel, setAvgDiesel]       = useState(DEFAULT_DIESEL_PRICE);
  const [fuelRegions, setFuelRegions]   = useState<FuelRegion[]>([]);
  const lastFetched                     = useRef('');

  const isValidZip = (z: string) => /^\d{5}$/.test(z.trim());

  useEffect(() => {
    const f = fromZip.trim(), t = toZip.trim();
    if (!isValidZip(f) || !isValidZip(t)) return;
    const key = `${f}-${t}`;
    if (lastFetched.current === key) return;

    const run = async () => {
      setIsLoading(true);
      setError(null);
      lastFetched.current = key;
      try {
        const url  = import.meta.env.VITE_SUPABASE_URL;
        const akey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const res = await fetch(`${url}/functions/v1/calculate-distance`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${akey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromZip: f, toZip: t }),
        });
        if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || `Error ${res.status}`); setLocationInfo(null); return; }
        const data = await res.json();
        if (!data.from || !data.to || typeof data.distance !== 'number') { setError('Invalid response.'); setLocationInfo(null); return; }
        const fromLat = data.from.lat ?? 0;
        const fromLng = data.from.lng ?? 0;
        setLocationInfo({
          from: { city: data.from.city, state: data.from.state, lat: fromLat, lng: fromLng },
          to:   { city: data.to.city,   state: data.to.state,   lat: data.to.lat ?? fromLat, lng: data.to.lng ?? fromLng },
          distance: data.distance,
        });
        fetch(`${url}/functions/v1/get-diesel-prices`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${akey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromLat: data.from.lat, fromLng: data.from.lng, toLat: data.to.lat, toLng: data.to.lng }),
        }).then(r => r.json()).then(fd => {
          if (typeof fd.avgDieselPrice === 'number') setAvgDiesel(fd.avgDieselPrice);
          if (Array.isArray(fd.regions)) setFuelRegions(fd.regions);
        }).catch(() => {});
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
        setLocationInfo(null);
      } finally { setIsLoading(false); }
    };
    const timer = setTimeout(run, 300);
    return () => clearTimeout(timer);
  }, [fromZip, toZip]);

  const reset = () => {
    setFromZip(''); setToZip(''); setFromStairs(0); setToStairs(0);
    setLocationInfo(null); lastFetched.current = ''; setError(null);
    setAvgDiesel(DEFAULT_DIESEL_PRICE); setFuelRegions([]);
  };

  return { fromZip, setFromZip, toZip, setToZip, fromStairs, setFromStairs, toStairs, setToStairs,
           locationInfo, setLocationInfo, isLoading, error, avgDiesel, fuelRegions, lastFetched, reset, isValidZip };
}

// ─── ZIP Step UI (shared between both engines) ────────────────────────────────

interface ZipStepProps {
  fromZip: string; setFromZip: (v: string) => void;
  toZip: string; setToZip: (v: string) => void;
  fromStairs: number; setFromStairs: (v: number) => void;
  toStairs: number; setToStairs: (v: number) => void;
  locationInfo: LocationInfo | null;
  isLoading: boolean;
  error: string | null;
  onClearEstimate: () => void;
  lastFetched: React.MutableRefObject<string>;
}

function ZipStep({ fromZip, setFromZip, toZip, setToZip, fromStairs, setFromStairs,
                   toStairs, setToStairs, locationInfo, isLoading, error,
                   onClearEstimate, lastFetched }: ZipStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
          <MapPin className="w-4 h-4 text-teal-600" /> Moving From & To
        </label>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label:'Origin',      Icon: MapPin,     val: fromZip, set: setFromZip, city: locationInfo?.from },
            { label:'Destination', Icon: Navigation, val: toZip,   set: setToZip,   city: locationInfo?.to  },
          ].map(({ label, Icon, val, set, city }) => (
            <div key={label} className="bg-slate-50 border-2 border-slate-100 rounded-xl p-5 hover:border-teal-200 transition-all duration-200 focus-within:border-teal-500 focus-within:bg-white">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Icon className="w-4 h-4 text-teal-600" />
                </div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
              </div>
              <input
                type="text" value={val} maxLength={5} placeholder="ZIP Code"
                onChange={e => { set(e.target.value); onClearEstimate(); lastFetched.current = ''; }}
                className="w-full bg-transparent text-2xl font-semibold text-slate-900 placeholder-slate-300 focus:outline-none"
              />
              {city && <p className="mt-2 text-sm text-slate-500">{city.city}, {city.state}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label:'Flights of stairs at origin',      value: fromStairs, onChange: setFromStairs },
          { label:'Flights of stairs at destination', value: toStairs,   onChange: setToStairs   },
        ].map(({ label, value, onChange }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
              <StairsIcon className="w-4 h-4 text-slate-500" />
            </div>
            <span className="text-sm text-slate-600 flex-1 leading-tight">{label}</span>
            <select value={value} onChange={e => onChange(Number(e.target.value))}
              className="w-20 bg-slate-50 border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:border-teal-200 focus:border-teal-500 focus:outline-none">
              {[0,1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-3 px-5 py-3 bg-slate-800 rounded-xl shadow-lg">
            <div className="w-5 h-5 border-2 border-slate-600 border-t-teal-400 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Calculating distance...</p>
          </div>
        </div>
      )}
      {locationInfo && !isLoading && (
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-3 px-5 py-3 bg-slate-800 rounded-xl shadow-lg">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
              <Navigation className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Driving Distance</p>
              <p className="text-xl font-bold text-white">{locationInfo.distance.toLocaleString()} miles</p>
            </div>
          </div>
        </div>
      )}
      {error && <div className="p-4 bg-red-50 rounded-xl border border-red-200"><p className="text-center text-red-700 text-sm">{error}</p></div>}
    </div>
  );
}

// ─── Engine 1: Quick Volume Estimator (4-step standalone) ─────────────────────

const QUICK_STEPS = [
  { id:1, title:'Home Size',  icon: Home     },
  { id:2, title:'Location',   icon: MapPin   },
  { id:3, title:'Services',   icon: Package  },
  { id:4, title:'Move Date',  icon: Calendar },
];

function QuickEstimatorEngine({ snapshot, engineRef, onClearSnapshot }: {
  snapshot?: InventorySnapshot | null;
  engineRef?: React.RefObject<HTMLDivElement>;
  onClearSnapshot?: () => void;
}) {
  const fromInventory = snapshot != null && snapshot.totalCf > 0;
  const [step, setStep]               = useState(1);
  const [homeSize, setHomeSize]       = useState<HomeSize | null>(null);
  const [furnishLevel, setFurnishLevel] = useState<FurnishLevel | null>(null);
  const [propertyType, setPropertyType] = useState<PropertyType>('apartment');
  const [hasGarage, setHasGarage]       = useState(false);
  const [hasPatio, setHasPatio]         = useState(false);
  const [packingBoxes, setPackingBoxes] = useState(0);
  const [storage, setStorage]         = useState(false);
  const [assembly, setAssembly]       = useState(false);
  const [moveDate, setMoveDate]       = useState<Date | null>(null);
  const [isBusyDay, setIsBusyDay]     = useState(false);
  const [storageUnits, setStorageUnits] = useState<StorageUnit[]>(fallbackStorageUnits);
  const [estimate, setEstimate]       = useState<MoveEstimate | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const calcRef = useRef<HTMLDivElement>(null);

  const dist = useDistanceLookup();

  useEffect(() => {
    supabase.from('storage_units').select('*').order('sort_order', { ascending: true })
      .then(({ data }) => { if (data && data.length > 0) setStorageUnits(data); });
  }, []);

  // When a new inventory snapshot is passed in, reset to step 1 and clear prior estimate
  useEffect(() => {
    if (snapshot) { setStep(1); setEstimate(null); }
  }, [snapshot]);

  const baseCf     = homeSize ? BASE_CF[homeSize] : 0;
  const mult       = furnishLevel ? FURNISH_OPTIONS.find(f => f.key === furnishLevel)!.multiplier : 1;
  const garageBonusCf = homeSize && hasGarage ? GARAGE_CF[homeSize] : 0;
  const patioBonusCf  = homeSize && hasPatio  ? PATIO_CF[homeSize]  : 0;
  const volumeCf   = fromInventory
    ? snapshot!.totalCf
    : (homeSize && furnishLevel ? Math.round(baseCf * mult) + garageBonusCf + patioBonusCf : 0);
  const canonical = volumeCf > 0 ? cfToCanonicalSize(volumeCf) : '';
  const weight   = Math.round(volumeCf * 7);
  const truck    = getTruck(volumeCf);

  const canonicalForPricing = fromInventory && snapshot
    ? snapshot.canonical
    : (canonical || (homeSize ? (HOME_SIZES.find(s => s.key === homeSize)?.canonical ?? 'Studio') : 'Studio'));
  const storageUnit = getStorageUnit(canonicalForPricing, storageUnits);

  const step1Valid = fromInventory || (homeSize !== null && furnishLevel !== null);
  const step2Valid = dist.isValidZip(dist.fromZip) && dist.isValidZip(dist.toZip) && dist.locationInfo !== null;
  const step3Valid = true;
  const step4Valid = moveDate !== null;

  const canProceed = (s: number) => {
    if (s === 1) return step1Valid;
    if (s === 2) return step2Valid;
    if (s === 3) return step3Valid;
    return false;
  };

  const handlePackingChange = (count: number) => { setPackingBoxes(count); setEstimate(null); };
  const handleServiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    if (name === 'storage') setStorage(checked);
    if (name === 'assembly') setAssembly(checked);
    setEstimate(null);
  };

  const doCalculate = () => {
    if (!dist.locationInfo || !moveDate) return;
    setEstimate(null);
    setIsCalculating(true);
    setTimeout(() => {
      const currentIdx = furnishLevel ? FURNISH_OPTIONS.findIndex(f => f.key === furnishLevel) : -1;
      const nextOption = currentIdx >= 0 ? FURNISH_OPTIONS[currentIdx + 1] : undefined;
      const miles = dist.locationInfo!.distance;
      const isConsolidate = miles >= 500;
      const CONSOLIDATE_MIN_LOW  = 300;
      const CONSOLIDATE_MIN_HIGH = 371;
      let cfLow: number;
      let cfHigh: number;
      if (fromInventory || currentIdx < 0) {
        const base = (fromInventory && snapshot) ? snapshot.totalCf : volumeCf || 223;
        cfLow  = base;
        cfHigh = Math.round(base * 1.10);
      } else {
        cfLow  = Math.round(baseCf * FURNISH_OPTIONS[currentIdx].multiplier) + garageBonusCf + patioBonusCf;
        cfHigh = (nextOption
          ? Math.round(baseCf * nextOption.multiplier)
          : Math.round(baseCf * FURNISH_OPTIONS[currentIdx].multiplier * 1.33)) + garageBonusCf + patioBonusCf;
      }
      if (isConsolidate) {
        cfLow  = Math.max(cfLow,  CONSOLIDATE_MIN_LOW);
        cfHigh = Math.max(cfHigh, CONSOLIDATE_MIN_HIGH);
      }
      const isCA = dist.locationInfo!.from.state === 'CA' || dist.locationInfo!.to.state === 'CA';
      const cfNorm = isCA ? cfRateNormalCA : cfRateNormal;
      const cfBusy = isCA ? cfRateBusyCA   : cfRateBusy;
      let baseLow = 0, baseHigh = 0;
      if (miles < 500) {
        const cfRate   = isBusyDay ? cfBusy : cfNorm;
        const mileRate = miles <= 50 ? mileRateLocal : mileRateLong;
        baseLow  = cfLow  * cfRate + miles * mileRate;
        baseHigh = cfHigh * cfRate + miles * mileRate;
      } else {
        const pMult = isBusyDay ? busyDayPrice : normalDayPrice;
        const rate  = getRegionRate(dist.locationInfo!.to.state);
        baseLow  = cfLow  * rate * pMult;
        baseHigh = cfHigh * rate * pMult;
      }

      const peakSurchargeLow  = isBusyDay ? Math.round(cfLow  * (cfBusy - cfNorm)) : 0;
      const peakSurchargeHigh = isBusyDay ? Math.round(cfHigh * (cfBusy - cfNorm)) : 0;
      const packingCost = packingBoxes > 0 ? (packingBoxes / 10) * 150 : 0;
      const stairsCost  = (dist.fromStairs + dist.toStairs) * pricePerFlight;
      let storageCost = 0, storageUnitSize = '', storageUnitDimensions = '';
      if (storage) { storageCost = storageUnit.price; storageUnitSize = storageUnit.size; storageUnitDimensions = storageUnit.dimensions; }

      let lowTotal  = baseLow  + packingCost + storageCost + stairsCost;
      let highTotal = baseHigh + packingCost + storageCost + stairsCost;
      if (assembly) { lowTotal += 30; highTotal += 75; }

      setEstimate({
        low: Math.round(lowTotal), high: Math.round(highTotal),
        fromZip: dist.fromZip.trim(), toZip: dist.toZip.trim(),
        homeSize: canonicalForPricing,
        packing: packingBoxes > 0, packingBoxes, storage, assembly,
        distanceMiles: miles,
        fromCity: dist.locationInfo!.from.city, fromState: dist.locationInfo!.from.state,
        toCity: dist.locationInfo!.to.city,     toState:  dist.locationInfo!.to.state,
        moveDate: moveDate!,
        fromStairs: dist.fromStairs, toStairs: dist.toStairs, isBusyDay,
        baseLow: Math.round(baseLow), baseHigh: Math.round(baseHigh),
        packingCost: Math.round(packingCost), storageCost: Math.round(storageCost), stairsCost,
        peakSurchargeLow, peakSurchargeHigh,
        storageUnitSize, storageUnitDimensions,
      });
      setIsCalculating(false);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }, 2000);
  };

  const handleLeadSuccess = () => {
    setEstimate(null); setStep(1);
    setHomeSize(null); setFurnishLevel(null);
    setPackingBoxes(0); setStorage(false); setAssembly(false);
    setMoveDate(null); setIsBusyDay(false);
    dist.reset();
  };

  return (
    <div ref={calcRef} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {isCalculating && <LoadingOverlay />}

      {/* Header */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-600 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
            <img src="/image0.png" alt="Move Price" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg leading-tight">Quick Volume Estimate</h2>
            <p className="text-teal-100 text-sm">Get a fast estimate in 4 quick steps</p>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center justify-center">
          {QUICK_STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => { if (s.id < step || (s.id > 1 && canProceed(s.id - 1))) setStep(s.id); }}
                disabled={s.id > step && !canProceed(s.id - 1)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 text-sm ${
                  step === s.id ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30'
                  : step > s.id ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                  : 'bg-slate-100 text-slate-400'}`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${step === s.id ? 'bg-white/20' : step > s.id ? 'bg-teal-200' : 'bg-slate-200'}`}>
                  {step > s.id ? <Check className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                </div>
                <span className="hidden sm:inline font-medium">{s.title}</span>
              </button>
              {idx < QUICK_STEPS.length - 1 && (
                <div className={`w-6 sm:w-10 h-1 mx-1.5 rounded-full transition-colors ${step > s.id ? 'bg-teal-500' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="p-6">

        {/* Step 1: Home size + furnish level (or inventory summary) */}
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">

            {/* ── Inventory-mode banner ── */}
            {fromInventory && (
              <div className="bg-teal-50 border-2 border-teal-400 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-teal-700 font-semibold text-sm">
                  <ClipboardList className="w-4 h-4 shrink-0" />
                  Volume from your item checklist
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white rounded-lg p-3 border border-teal-100">
                    <div className="text-2xl font-bold text-slate-800">{snapshot!.totalCf.toLocaleString()}</div>
                    <div className="text-xs text-slate-400 mt-0.5">cubic feet</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-teal-100">
                    <div className="text-2xl font-bold text-slate-800">{Math.round(snapshot!.totalCf * 7).toLocaleString()}</div>
                    <div className="text-xs text-slate-400 mt-0.5">est. lbs</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-teal-100">
                    <div className="text-sm font-bold text-slate-800 leading-tight">{getTruck(snapshot!.totalCf).truck}</div>
                    <div className="text-xs text-slate-400 mt-0.5">recommended</div>
                  </div>
                </div>
                {snapshot!.rawCf < MIN_STUDIO_CF && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 leading-snug">
                    Your checked items total {snapshot!.rawCf} ft³, below our {MIN_STUDIO_CF} ft³ minimum (minimal studio). We'll price at the minimum.
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{snapshot!.itemCount} items checked &nbsp;·&nbsp; equiv. {snapshot!.canonical} home</span>
                  <button
                    onClick={onClearSnapshot}
                    className="text-slate-400 hover:text-slate-600 underline transition-colors ml-4">
                    Use quick estimator instead
                  </button>
                </div>
              </div>
            )}

            {!fromInventory && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Property Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['apartment','house'] as PropertyType[]).map(pt => (
                    <button key={pt} onClick={() => setPropertyType(pt)}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-sm font-medium ${
                        propertyType === pt
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
                      {pt === 'apartment' ? <Building2 className="w-4 h-4 shrink-0" /> : <Home className="w-4 h-4 shrink-0" />}
                      <span className="capitalize">{pt}</span>
                    </button>
                  ))}
                </div>

                {/* Garage / Patio checkboxes */}
                <div className="mt-3 flex gap-3">
                  {[
                    { key: 'garage', label: 'Garage', checked: hasGarage, set: setHasGarage,
                      note: homeSize ? `~${GARAGE_CF[homeSize]} ft³ avg` : null,
                      disabled: !homeSize || homeSize === 'studio' },
                    { key: 'patio',  label: 'Patio / Outdoor', checked: hasPatio,  set: setHasPatio,
                      note: homeSize ? `~${PATIO_CF[homeSize]} ft³ avg` : null,
                      disabled: false },
                  ].map(({ key, label, checked, set, note, disabled }) => (
                    <button
                      key={key}
                      disabled={disabled}
                      onClick={() => !disabled && set((v: boolean) => !v)}
                      className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all text-sm
                        ${disabled ? 'opacity-40 cursor-not-allowed border-slate-100 bg-slate-50' :
                          checked
                            ? 'border-teal-500 bg-teal-50 text-teal-700'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                        ${checked && !disabled ? 'bg-teal-500 border-teal-500' : 'border-slate-300 bg-white'}`}>
                        {checked && !disabled && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                      </div>
                      <div className="text-left min-w-0">
                        <div className="font-medium leading-tight">{label}</div>
                        {note && <div className={`text-xs mt-0.5 ${checked && !disabled ? 'text-teal-500' : 'text-slate-400'}`}>{note}</div>}
                      </div>
                    </button>
                  ))}
                </div>
                {homeSize === 'studio' && (
                  <p className="text-xs text-slate-400 mt-2 pl-1">Garage not typically available for studios.</p>
                )}
              </div>
            )}

            {!fromInventory && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Home Size</label>
                <div className="grid grid-cols-5 gap-2">
                  {HOME_SIZES.map(s => (
                    <button key={s.key} onClick={() => { setHomeSize(s.key); setFurnishLevel(null); }}
                      className={`py-3 rounded-xl border-2 transition-all text-center ${
                        homeSize === s.key
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
                      <div className="text-sm font-bold leading-tight">{s.short}</div>
                      <div className="text-xs text-slate-400 mt-0.5 hidden sm:block">{s.key === 'studio' ? 'Studio' : `${s.beds} Bed`}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!fromInventory && homeSize && (
              <div className="animate-fadeIn">
                <label className="block text-sm font-semibold text-slate-700 mb-3">How much stuff do you have?</label>
                <div className="grid grid-cols-2 gap-3">
                  {FURNISH_OPTIONS.map(opt => {
                    const cf = Math.round(BASE_CF[homeSize] * opt.multiplier);
                    return (
                      <button key={opt.key} onClick={() => setFurnishLevel(opt.key)}
                        className={`text-left px-4 py-3.5 rounded-xl border-2 transition-all ${
                          furnishLevel === opt.key ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-semibold text-sm ${furnishLevel === opt.key ? 'text-teal-700' : 'text-slate-700'}`}>{opt.label}</span>
                          <span className={`text-sm font-bold ${furnishLevel === opt.key ? 'text-teal-600' : 'text-slate-500'}`}>{cf} ft³</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-snug">{opt.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {volumeCf > 0 && (
              <div className="animate-fadeIn bg-gradient-to-br from-slate-50 to-teal-50 rounded-xl border border-teal-100 p-5 space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white rounded-lg p-3 border border-slate-100">
                    <div className="text-2xl font-bold text-slate-800">{volumeCf.toLocaleString()}</div>
                    <div className="text-xs text-slate-400 mt-0.5">cubic feet</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-100">
                    <div className="text-2xl font-bold text-slate-800">{weight.toLocaleString()}</div>
                    <div className="text-xs text-slate-400 mt-0.5">est. lbs</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-100">
                    <div className="text-sm font-bold text-slate-800 leading-tight">{truck.truck}</div>
                    <div className="text-xs text-slate-400 mt-0.5">recommended</div>
                  </div>
                </div>
                {(garageBonusCf > 0 || patioBonusCf > 0) && (
                  <div className="bg-white rounded-lg border border-slate-100 px-3 py-2 space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Interior / boxes</span>
                      <span className="font-medium">{(volumeCf - garageBonusCf - patioBonusCf).toLocaleString()} ft³</span>
                    </div>
                    {garageBonusCf > 0 && (
                      <div className="flex justify-between text-xs text-teal-600">
                        <span>Garage (avg estimate)</span>
                        <span className="font-medium">+{garageBonusCf} ft³</span>
                      </div>
                    )}
                    {patioBonusCf > 0 && (
                      <div className="flex justify-between text-xs text-teal-600">
                        <span>Patio / Outdoor (avg estimate)</span>
                        <span className="font-medium">+{patioBonusCf} ft³</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs font-semibold text-slate-700 border-t border-slate-100 pt-1">
                      <span>Total</span>
                      <span>{volumeCf.toLocaleString()} ft³</span>
                    </div>
                  </div>
                )}
                <p className="text-xs text-slate-400 text-center">{truck.note} · weight at 7 lb/ft³ avg</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: ZIP codes + stairs */}
        {step === 2 && (
          <div className="animate-fadeIn">
            <ZipStep
              fromZip={dist.fromZip} setFromZip={dist.setFromZip}
              toZip={dist.toZip} setToZip={dist.setToZip}
              fromStairs={dist.fromStairs} setFromStairs={dist.setFromStairs}
              toStairs={dist.toStairs} setToStairs={dist.setToStairs}
              locationInfo={dist.locationInfo}
              isLoading={dist.isLoading}
              error={dist.error}
              onClearEstimate={() => setEstimate(null)}
              lastFetched={dist.lastFetched}
            />
          </div>
        )}

        {/* Step 3: Services */}
        {step === 3 && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
                <Package className="w-4 h-4 text-teal-600" /> Additional Services
              </label>
              <p className="text-slate-500 mb-6">Select any additional services you need for your move. These are optional.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PackingServiceOption boxCount={packingBoxes} onChange={handlePackingChange} />
                <ServiceOption
                  icon={Warehouse} name="storage" label="Storage"
                  description={`${storageUnit.size} unit (${storageUnit.dimensions}) · ${storageUnit.usable_cu_ft} cu ft usable`}
                  price={storageUnit.price} checked={storage} onChange={handleServiceChange}
                  disclaimer="Storage move-out is charged as a separate move"
                />
                <ServiceOption
                  icon={Wrench} name="assembly" label="Assembly"
                  description="Furniture dis/assembly"
                  price={30} priceMax={75} checked={assembly} onChange={handleServiceChange}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Move date */}
        {step === 4 && (
          <div className="space-y-8 animate-fadeIn">
            <MoveDatePicker
              selectedDate={moveDate}
              onChange={(d, busy) => { setMoveDate(d); setIsBusyDay(busy); setEstimate(null); }}
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="px-6 pb-6">
        <div className="flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
          {step < 4 ? (
            <button onClick={() => { setStep(s => s + 1); setTimeout(() => calcRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50); }} disabled={!canProceed(step)}
              className="flex-1 py-3.5 px-5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-600/30 disabled:shadow-none">
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={doCalculate} disabled={!step4Valid || isCalculating}
              className="flex-1 py-3.5 px-5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-600/30 disabled:shadow-none">
              {isCalculating
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Calculating...</>
                : <>Get My Estimate <ArrowRight className="w-4 h-4" /></>}
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {estimate && (
        <div ref={resultsRef}>
          <LeadCaptureForm
            moveDetails={{
              fromZip: estimate.fromZip, toZip: estimate.toZip,
              homeSize: estimate.homeSize,
              packing: estimate.packing, packingBoxes: estimate.packingBoxes,
              storage: estimate.storage, assembly: estimate.assembly,
              estimatedLow: estimate.low, estimatedHigh: estimate.high,
              distanceMiles: estimate.distanceMiles,
              fromCity: estimate.fromCity, fromState: estimate.fromState,
              toCity: estimate.toCity, toState: estimate.toState,
              moveDate: estimate.moveDate,
              fromStairs: estimate.fromStairs, toStairs: estimate.toStairs,
              isBusyDay: estimate.isBusyDay,
              baseLow: estimate.baseLow, baseHigh: estimate.baseHigh,
              packingCost: estimate.packingCost, storageCost: estimate.storageCost,
              stairsCost: estimate.stairsCost,
              peakSurchargeLow: estimate.peakSurchargeLow,
              peakSurchargeHigh: estimate.peakSurchargeHigh,
              storageUnitSize: estimate.storageUnitSize,
              storageUnitDimensions: estimate.storageUnitDimensions,
              avgDieselPrice: dist.avgDiesel,
              inventoryItems: snapshot?.items ?? [],
              totalCubicFeet: snapshot?.totalCf,
            }}
            onSuccess={handleLeadSuccess}
          />
        </div>
      )}

      {estimate && dist.locationInfo && (
        <div className="mt-0 bg-white border-t border-slate-200 p-6 sm:p-8">
          <TruckRentalSnapshot
            homeSize={estimate.homeSize}
            miles={estimate.distanceMiles}
            fromState={estimate.fromState}
            toState={estimate.toState}
            fromLat={dist.locationInfo.from.lat}
            fromLng={dist.locationInfo.from.lng}
            toLat={dist.locationInfo.to.lat}
            toLng={dist.locationInfo.to.lng}
            fromLabel={`${estimate.fromCity}, ${estimate.fromState} (${estimate.fromZip})`}
            toLabel={`${estimate.toCity}, ${estimate.toState} (${estimate.toZip})`}
            avgDieselPrice={dist.avgDiesel}
          />
        </div>
      )}
    </div>
  );
}

// ─── Engine 2: Inventory Builder ──────────────────────────────────────────────

interface InventoryEngineProps {
  storageUnits: StorageUnit[];
  onGetEstimate?: (snapshot: InventorySnapshot) => void;
}

function InventoryEngine({ storageUnits, onGetEstimate }: InventoryEngineProps) {
  const navigate = useNavigate();

  const [selectedSize, setSelectedSize] = useState<HomeSize>('studio');
  const [items, setItems]               = useState<InventoryItem[]>(() => makeItemList(ITEMS_BY_SIZE['studio']));
  const [openRooms, setOpenRooms]       = useState<Record<string, boolean>>(() =>
    ITEMS_BY_SIZE['studio'].reduce((acc, g, i) => ({ ...acc, [g.room]: i === 0 }), {})
  );
  const [customItems, setCustomItems]   = useState<CustomItem[]>([]);
  const [newName, setNewName]           = useState('');
  const [newCf, setNewCf]               = useState('');
  const [showAddForm, setShowAddForm]   = useState(false);

  // pricing wizard states
  const [packingBoxes, setPackingBoxes] = useState(0);
  const [storage, setStorage]           = useState(false);
  const [assembly, setAssembly]         = useState(false);
  const [moveDate, setMoveDate]         = useState<Date | null>(null);
  const [isBusyDay, setIsBusyDay]       = useState(false);
  const [estimate, setEstimate]         = useState<MoveEstimate | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showPricing, setShowPricing]   = useState(false);
  const pricingRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // inline "email my list" mini-form
  const [showEmailForm, setShowEmailForm]   = useState(false);
  const [emailName, setEmailName]           = useState('');
  const [emailAddr, setEmailAddr]           = useState('');
  const [emailSending, setEmailSending]     = useState(false);
  const [emailSent, setEmailSent]           = useState(false);
  const [emailError, setEmailError]         = useState<string | null>(null);

  const dist = useDistanceLookup();

  const switchSize = (size: HomeSize | null) => {
    setSelectedSize(size);
    const groups = size ? ITEMS_BY_SIZE[size] : ALL_ROOMS_FLAT;
    setItems(makeItemList(groups));
    setOpenRooms(groups.reduce((acc, g, i) => ({ ...acc, [g.room]: i < 2 }), {}));
    setCustomItems([]);
  };

  const toggleRoom  = (r: string) => setOpenRooms(p => ({ ...p, [r]: !p[r] }));
  const toggleItem  = (id: string) => setItems(p => p.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  const changeQty   = (id: string, d: number) => setItems(p => p.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + d) } : i));
  const changeCustomQty = (id: string, d: number) => setCustomItems(p => p.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + d) } : i));
  const removeCustom    = (id: string) => setCustomItems(p => p.filter(i => i.id !== id));

  const addCustomItem = () => {
    const cf = parseFloat(newCf);
    if (!newName.trim() || isNaN(cf) || cf <= 0) return;
    setCustomItems(p => [...p, { id: `c-${Date.now()}`, name: newName.trim(), cubicFeet: cf, qty: 1 }]);
    setNewName(''); setNewCf(''); setShowAddForm(false);
  };

  const checkedItems   = items.filter(i => i.checked);
  const inventoryTotal = checkedItems.reduce((s, i) => s + i.cubicFeet * i.qty, 0);
  const customTotal    = customItems.reduce((s, i) => s + i.cubicFeet * i.qty, 0);
  const rawTotal       = inventoryTotal + customTotal;
  const isBelowMinimum = rawTotal > 0 && rawTotal < MIN_STUDIO_CF;
  const grandTotal     = rawTotal > 0 ? Math.max(rawTotal, MIN_STUDIO_CF) : 0;
  const weight         = Math.round(grandTotal * 7);
  const truck          = getTruck(grandTotal);
  const canonical      = grandTotal > 0 ? cfToCanonicalSize(grandTotal) : '';

  const storageUnit = getStorageUnit(canonical || 'Studio', storageUnits);

  const handlePackingChange = (count: number) => { setPackingBoxes(count); setEstimate(null); };
  const handleServiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    if (name === 'storage') setStorage(checked);
    if (name === 'assembly') setAssembly(checked);
    setEstimate(null);
  };

  const canonicalToHomeSize = (c: string): HomeSize => {
    if (c === 'Studio') return 'studio';
    if (c === '1BR')    return '1br';
    if (c === '3BR')    return '3br';
    if (c === '4BR')    return '4br';
    return '2br';
  };

  const handleGetPrice = () => {
    if (onGetEstimate && grandTotal > 0) {
      onGetEstimate({
        totalCf:   grandTotal,
        rawCf:     rawTotal,
        itemCount: checkedItems.length + customItems.length,
        canonical: canonical || 'Studio',
        homeSize:  canonicalToHomeSize(canonical || 'Studio'),
        items: [...checkedItems, ...customItems].map(i => ({
          name: i.name,
          room: (i as InventoryItem).room ?? 'Custom',
          cubicFeet: i.cubicFeet,
          qty: i.qty,
        })),
      });
    } else {
      setShowPricing(true);
      setTimeout(() => pricingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  };

  const handleEmailList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddr)) return;
    setEmailSending(true);
    setEmailError(null);
    const supabase = (await import('@supabase/supabase-js')).createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    );
    const inventoryForDb = [...checkedItems, ...customItems].map(i => ({
      name: i.name,
      room: (i as InventoryItem).room ?? 'Custom',
      cubicFeet: i.cubicFeet,
      qty: i.qty,
    }));
    try {
      await supabase.from('moving_leads').insert({
        name: emailName.trim(),
        email: emailAddr.trim().toLowerCase(),
        phone: '',
        from_zip: '', to_zip: '', home_size: canonical || 'Studio',
        packing: false, storage: false, assembly: false,
        estimated_low: 0, estimated_high: 0, distance_miles: 0,
        from_city: '', from_state: '', to_city: '', to_state: '',
        move_date: new Date().toISOString().split('T')[0],
        from_stairs: 0, to_stairs: 0, is_busy_day: false,
        inventory_items: inventoryForDb,
        total_cubic_feet: grandTotal,
        lead_type: 'email_list',
      });
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-lead-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          name: emailName.trim(),
          email: emailAddr.trim().toLowerCase(),
          phone: '',
          fromCity: '', fromState: '', fromZip: '',
          toCity: '', toState: '', toZip: '',
          homeSize: canonical || 'Studio',
          moveDate: new Date().toISOString().split('T')[0],
          distanceMiles: 0,
          estimatedLow: 0, estimatedHigh: 0,
          packing: false, packingBoxes: 0,
          storage: false, storageUnitSize: '', storageUnitDimensions: '',
          assembly: false, fromStairs: 0, toStairs: 0, isBusyDay: false,
          inventoryItems: inventoryForDb,
          totalCubicFeet: grandTotal,
          leadType: 'email_list',
        }),
      });
      setEmailSent(true);
    } catch {
      setEmailError('Something went wrong. Please try again.');
    } finally {
      setEmailSending(false);
    }
  };

  const doCalculate = () => {
    if (!dist.locationInfo || !moveDate) return;
    setEstimate(null);
    setIsCalculating(true);
    setTimeout(() => {
      const miles = dist.locationInfo!.distance;
      const isConsolidate = miles >= 500;
      let cfLow  = grandTotal > 0 ? grandTotal : 223;
      let cfHigh = Math.round(cfLow * 1.25);
      if (isConsolidate) {
        cfLow  = Math.max(cfLow,  300);
        cfHigh = Math.max(cfHigh, 371);
      }
      const isCA = dist.locationInfo!.from.state === 'CA' || dist.locationInfo!.to.state === 'CA';
      const cfNorm = isCA ? cfRateNormalCA : cfRateNormal;
      const cfBusy = isCA ? cfRateBusyCA   : cfRateBusy;
      let baseLow = 0, baseHigh = 0;
      if (miles < 500) {
        const cfRate   = isBusyDay ? cfBusy : cfNorm;
        const mileRate = miles <= 50 ? mileRateLocal : mileRateLong;
        baseLow  = cfLow  * cfRate + miles * mileRate;
        baseHigh = cfHigh * cfRate + miles * mileRate;
      } else {
        const pMult = isBusyDay ? busyDayPrice : normalDayPrice;
        const rate  = getRegionRate(dist.locationInfo!.to.state);
        baseLow  = cfLow  * rate * pMult;
        baseHigh = cfHigh * rate * pMult;
      }

      const peakSurchargeLow  = isBusyDay ? Math.round(cfLow  * (cfBusy - cfNorm)) : 0;
      const peakSurchargeHigh = isBusyDay ? Math.round(cfHigh * (cfBusy - cfNorm)) : 0;
      const packingCost = packingBoxes > 0 ? (packingBoxes / 10) * 150 : 0;
      const stairsCost  = (dist.fromStairs + dist.toStairs) * pricePerFlight;
      let storageCost = 0, storageUnitSize = '', storageUnitDimensions = '';
      if (storage) { storageCost = storageUnit.price; storageUnitSize = storageUnit.size; storageUnitDimensions = storageUnit.dimensions; }

      let lowTotal  = baseLow  + packingCost + storageCost + stairsCost;
      let highTotal = baseHigh + packingCost + storageCost + stairsCost;
      if (assembly) { lowTotal += 30; highTotal += 75; }

      setEstimate({
        low: Math.round(lowTotal), high: Math.round(highTotal),
        fromZip: dist.fromZip.trim(), toZip: dist.toZip.trim(),
        homeSize: canonical,
        packing: packingBoxes > 0, packingBoxes, storage, assembly,
        distanceMiles: miles,
        fromCity: dist.locationInfo!.from.city, fromState: dist.locationInfo!.from.state,
        toCity: dist.locationInfo!.to.city,     toState:  dist.locationInfo!.to.state,
        moveDate: moveDate!,
        fromStairs: dist.fromStairs, toStairs: dist.toStairs, isBusyDay,
        baseLow: Math.round(baseLow), baseHigh: Math.round(baseHigh),
        packingCost: Math.round(packingCost), storageCost: Math.round(storageCost), stairsCost,
        peakSurchargeLow, peakSurchargeHigh,
        storageUnitSize, storageUnitDimensions,
      });
      setIsCalculating(false);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }, 2000);
  };

  const handleLeadSuccess = () => {
    setEstimate(null); setShowPricing(false);
    setPackingBoxes(0); setStorage(false); setAssembly(false);
    setMoveDate(null); setIsBusyDay(false);
    dist.reset();
  };

  const rooms = [...new Set(items.map(i => i.room))];

  // Comparison data
  const uhaulSize  = uhaulSizeByHomeSize[canonical]  ?? uhaulSizeByHomeSize['2BR'];
  const penSize    = penskeSizeByHomeSize[canonical]  ?? penskeSizeByHomeSize['2BR'];
  const budgetSize = budgetSizeByHomeSize[canonical]  ?? budgetSizeByHomeSize['2BR'];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {isCalculating && <LoadingOverlay />}

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg leading-tight">Item-by-Item Inventory</h2>
              <p className="text-slate-300 text-sm">Check items you're moving, adjust quantities</p>
            </div>
          </div>
          {grandTotal > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{grandTotal.toLocaleString()} <span className="text-base font-normal text-slate-300">ft³</span></div>
              <div className="text-xs text-slate-300">{weight.toLocaleString()} lbs · {truck.truck}</div>
            </div>
          )}
        </div>
      </div>

      {/* Size filter bar */}
      <div className="border-b border-slate-200 px-4 py-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 font-medium mr-1">Load items for:</span>
        <button onClick={() => switchSize(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedSize === null ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
          All Items
        </button>
        {HOME_SIZES.map(s => (
          <button key={s.key} onClick={() => switchSize(s.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedSize === s.key ? 'bg-teal-600 text-white border-teal-600' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Inventory list + sidebar */}
      <div className="flex flex-col lg:flex-row">
        <div className="flex-1 divide-y divide-slate-100 min-w-0">
          {rooms.map(room => {
            const roomItems    = items.filter(i => i.room === room);
            const isOpen       = !!openRooms[room];
            const checkedCount = roomItems.filter(i => i.checked).length;
            const roomCf       = roomItems.filter(i => i.checked).reduce((s, i) => s + i.cubicFeet * i.qty, 0);
            return (
              <div key={room}>
                <button onClick={() => toggleRoom(room)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    <span className="font-semibold text-slate-700 text-sm">{room}</span>
                    {checkedCount > 0 && <span className="bg-teal-100 text-teal-700 text-xs font-medium px-2 py-0.5 rounded-full">{checkedCount}</span>}
                  </div>
                  {roomCf > 0 && <span className="text-xs text-slate-400">{roomCf} ft³</span>}
                </button>
                {isOpen && (
                  <div className="bg-slate-50/40">
                    {roomItems.map(item => {
                      const isBoxRoom = room === 'Boxes';
                      return (
                        <div key={item.id} className={`flex items-center gap-3 px-5 py-2.5 border-b border-slate-100 last:border-0 transition-colors ${item.checked ? 'bg-teal-50/40' : 'hover:bg-slate-50'}`}>
                          <button onClick={() => toggleItem(item.id)} className="shrink-0 text-slate-400 hover:text-teal-600 transition-colors">
                            {item.checked ? <CheckSquare className="w-4 h-4 text-teal-600" /> : <Square className="w-4 h-4" />}
                          </button>
                          <span className={`flex-1 text-sm min-w-0 truncate ${item.checked ? 'text-slate-800 font-medium' : 'text-slate-600'}`}>{item.name}</span>
                          <span className="text-xs text-slate-400 w-12 text-right shrink-0">{item.cubicFeet > 0 ? `${item.cubicFeet} ft³` : 'TBD'}</span>
                          {isBoxRoom ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <input
                                type="number"
                                min={0}
                                value={item.checked ? item.qty : 0}
                                onChange={e => {
                                  const v = Math.max(0, parseInt(e.target.value) || 0);
                                  if (v === 0) {
                                    if (item.checked) toggleItem(item.id);
                                  } else {
                                    if (!item.checked) toggleItem(item.id);
                                    setItems(p => p.map(i => i.id === item.id ? { ...i, qty: v } : i));
                                  }
                                }}
                                className="w-14 h-7 rounded-md border border-slate-200 bg-white text-center text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
                              />
                              <span className="text-xs text-slate-400">boxes</span>
                            </div>
                          ) : (
                            item.checked && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => changeQty(item.id, -1)} className="w-6 h-6 rounded-md bg-slate-200 hover:bg-slate-300 flex items-center justify-center"><Minus className="w-3 h-3 text-slate-600" /></button>
                                <span className="w-5 text-center text-sm font-medium text-slate-700">{item.qty}</span>
                                <button onClick={() => changeQty(item.id, 1)} className="w-6 h-6 rounded-md bg-slate-200 hover:bg-slate-300 flex items-center justify-center"><Plus className="w-3 h-3 text-slate-600" /></button>
                              </div>
                            )
                          )}
                          {item.checked && item.cubicFeet > 0 && (
                            <span className="text-xs font-semibold text-teal-700 w-12 text-right shrink-0">{(item.cubicFeet * item.qty).toFixed(0)} ft³</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sidebar */}
        <div className="lg:w-64 border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col shrink-0">
          <div className="p-5 border-b border-slate-100 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Your Inventory</h3>
            {grandTotal === 0 ? (
              <p className="text-sm text-slate-400">Check items on the left to build your inventory.</p>
            ) : (
              <>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {checkedItems.map(i => (
                    <div key={i.id} className="flex justify-between text-xs text-slate-600">
                      <span className="truncate pr-2">{i.qty > 1 ? `${i.name} ×${i.qty}` : i.name}</span>
                      <span className="shrink-0 font-medium">{(i.cubicFeet * i.qty).toFixed(0)} ft³</span>
                    </div>
                  ))}
                  {customItems.map(i => (
                    <div key={i.id} className="flex justify-between text-xs text-slate-600 items-center">
                      <span className="truncate pr-2 text-teal-700">{i.name} <span className="text-slate-400">(custom)</span></span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => changeCustomQty(i.id, -1)} className="w-4 h-4 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center"><Minus className="w-2.5 h-2.5" /></button>
                        <span className="w-4 text-center font-medium">{i.qty}</span>
                        <button onClick={() => changeCustomQty(i.id, 1)} className="w-4 h-4 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center"><Plus className="w-2.5 h-2.5" /></button>
                        <span className="w-8 text-right font-medium">{(i.cubicFeet * i.qty).toFixed(0)} ft³</span>
                        <button onClick={() => removeCustom(i.id)} className="text-red-400 hover:text-red-600 ml-1">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-200 pt-3 space-y-1.5">
                  {isBelowMinimum && (
                    <div className="flex justify-between text-xs text-slate-500 line-through">
                      <span>Checked items</span><span>{rawTotal} ft³</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-slate-800">
                    <span>Total Volume</span><span>{grandTotal.toLocaleString()} ft³</span>
                  </div>
                  {isBelowMinimum && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 text-xs text-amber-700 leading-snug">
                      Your checked items total {rawTotal} ft³, below our {MIN_STUDIO_CF} ft³ minimum (minimal studio). Pricing uses the minimum.
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Est. Weight</span><span>{weight.toLocaleString()} lbs</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Truck Size</span><span className="font-medium text-teal-700">{truck.truck}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Add Custom Item</h3>
            {!showAddForm ? (
              <button onClick={() => setShowAddForm(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-teal-400 hover:text-teal-600 transition-colors text-sm">
                <Plus className="w-4 h-4" /> Add item not in the list
              </button>
            ) : (
              <div className="space-y-2.5">
                <input type="text" placeholder="Item name" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomItem()}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                <input type="number" placeholder="Cubic feet (e.g. 15)" value={newCf} onChange={e => setNewCf(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomItem()}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" min="0.5" step="0.5" />
                <div className="flex gap-2">
                  <button onClick={addCustomItem} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium py-2 rounded-lg transition-colors">Add</button>
                  <button onClick={() => { setShowAddForm(false); setNewName(''); setNewCf(''); }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium py-2 rounded-lg transition-colors">Cancel</button>
                </div>
              </div>
            )}
          </div>

          {grandTotal > 0 && !showPricing && (
            <div className="px-5 pb-5">
              <button onClick={handleGetPrice}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20">
                Get Price Estimate <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pricing section — appears below inventory once triggered */}
      {showPricing && grandTotal > 0 && (
        <div ref={pricingRef} className="border-t border-slate-200">
          <div className="bg-teal-600 px-6 py-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold">Getting price for {grandTotal.toLocaleString()} ft³ inventory</p>
              <p className="text-teal-100 text-sm">{canonical} equivalent · {truck.truck}</p>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* ZIP */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-600" /> Step 1 — Route
              </h3>
              <ZipStep
                fromZip={dist.fromZip} setFromZip={dist.setFromZip}
                toZip={dist.toZip} setToZip={dist.setToZip}
                fromStairs={dist.fromStairs} setFromStairs={dist.setFromStairs}
                toStairs={dist.toStairs} setToStairs={dist.setToStairs}
                locationInfo={dist.locationInfo}
                isLoading={dist.isLoading}
                error={dist.error}
                onClearEstimate={() => setEstimate(null)}
                lastFetched={dist.lastFetched}
              />
            </div>

            {/* Services */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-teal-600" /> Step 2 — Additional Services
              </h3>
              <p className="text-slate-500 text-sm mb-4">Select any additional services you need. These are optional.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PackingServiceOption boxCount={packingBoxes} onChange={handlePackingChange} />
                <ServiceOption
                  icon={Warehouse} name="storage" label="Storage"
                  description={`${storageUnit.size} unit (${storageUnit.dimensions}) · ${storageUnit.usable_cu_ft} cu ft usable`}
                  price={storageUnit.price} checked={storage} onChange={handleServiceChange}
                  disclaimer="Storage move-out is charged as a separate move"
                />
                <ServiceOption
                  icon={Wrench} name="assembly" label="Assembly"
                  description="Furniture dis/assembly"
                  price={30} priceMax={75} checked={assembly} onChange={handleServiceChange}
                />
              </div>
            </div>

            {/* Move date */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" /> Step 3 — Move Date
              </h3>
              <MoveDatePicker
                selectedDate={moveDate}
                onChange={(d, busy) => { setMoveDate(d); setIsBusyDay(busy); setEstimate(null); }}
              />
            </div>

            <button onClick={doCalculate}
              disabled={!dist.locationInfo || !moveDate || isCalculating}
              className="w-full py-4 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-lg rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-teal-600/30 disabled:shadow-none">
              {isCalculating
                ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Calculating...</>
                : <>Get My Estimate <ArrowRight className="w-5 h-5" /></>}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {estimate && (
        <div ref={resultsRef}>
          <LeadCaptureForm
            moveDetails={{
              fromZip: estimate.fromZip, toZip: estimate.toZip,
              homeSize: estimate.homeSize,
              packing: estimate.packing, packingBoxes: estimate.packingBoxes,
              storage: estimate.storage, assembly: estimate.assembly,
              estimatedLow: estimate.low, estimatedHigh: estimate.high,
              distanceMiles: estimate.distanceMiles,
              fromCity: estimate.fromCity, fromState: estimate.fromState,
              toCity: estimate.toCity, toState: estimate.toState,
              moveDate: estimate.moveDate,
              fromStairs: estimate.fromStairs, toStairs: estimate.toStairs,
              isBusyDay: estimate.isBusyDay,
              baseLow: estimate.baseLow, baseHigh: estimate.baseHigh,
              packingCost: estimate.packingCost, storageCost: estimate.storageCost,
              stairsCost: estimate.stairsCost,
              peakSurchargeLow: estimate.peakSurchargeLow,
              peakSurchargeHigh: estimate.peakSurchargeHigh,
              storageUnitSize: estimate.storageUnitSize,
              storageUnitDimensions: estimate.storageUnitDimensions,
              avgDieselPrice: dist.avgDiesel,
              inventoryItems: [...checkedItems, ...customItems].map(i => ({
                name: i.name,
                room: (i as InventoryItem).room ?? 'Custom',
                cubicFeet: i.cubicFeet,
                qty: i.qty,
              }) as InventoryLineItem),
              totalCubicFeet: grandTotal,
            }}
            onSuccess={handleLeadSuccess}
          />
        </div>
      )}

      {estimate && dist.locationInfo && (
        <div className="mt-0 bg-white border-t border-slate-200 p-6 sm:p-8">
          <TruckRentalSnapshot
            homeSize={estimate.homeSize}
            miles={estimate.distanceMiles}
            fromState={estimate.fromState}
            toState={estimate.toState}
            fromLat={dist.locationInfo.from.lat}
            fromLng={dist.locationInfo.from.lng}
            toLat={dist.locationInfo.to.lat}
            toLng={dist.locationInfo.to.lng}
            fromLabel={`${estimate.fromCity}, ${estimate.fromState} (${estimate.fromZip})`}
            toLabel={`${estimate.toCity}, ${estimate.toState} (${estimate.toZip})`}
            avgDieselPrice={dist.avgDiesel}
          />
        </div>
      )}

      {/* Movers vs Truck comparison after results */}
      {estimate && dist.locationInfo && (
        <div className="border-t border-slate-200 p-6 sm:p-8">
          <InventoryMoveComparison
            estimate={estimate}
            locationInfo={dist.locationInfo}
            avgDiesel={dist.avgDiesel}
            fuelRegions={dist.fuelRegions}
            uhaulSize={uhaulSize}
            penSize={penSize}
            budgetSize={budgetSize}
            navigate={navigate}
          />
        </div>
      )}
    </div>
  );
}

// ─── Move Comparison inline for Inventory Engine ──────────────────────────────

interface InvComparisonProps {
  estimate: MoveEstimate;
  locationInfo: LocationInfo;
  avgDiesel: number;
  fuelRegions: FuelRegion[];
  uhaulSize: string;
  penSize: string;
  budgetSize: string;
  navigate: ReturnType<typeof useNavigate>;
}

function InventoryMoveComparison({ estimate, locationInfo, avgDiesel, uhaulSize, penSize, budgetSize, navigate }: InvComparisonProps) {
  const miles = estimate.distanceMiles;

  const uhaul  = calcUhaulCosts(uhaulSize, miles, avgDiesel, estimate.fromState, estimate.toState);
  const budget = calcBudgetCosts(budgetSize, miles, avgDiesel, estimate.fromState, estimate.toState);
  const penske = calcPenskeCosts(
    calculatePenskePricing(penSize as Parameters<typeof calculatePenskePricing>[0], miles, estimate.fromState, estimate.toState),
    miles, avgDiesel, penSize as Parameters<typeof calculatePenskePricing>[0],
  );

  const truckLow  = Math.min(uhaul.total, budget.total, penske.total);
  const truckHigh = Math.max(uhaul.total, budget.total, penske.total);

  const truckCompanies = [
    { name:'U-Haul',  logo:'/U-haullogo.jpg',             total: uhaul.total,  url:'https://www.uhaul.com/Truck-Rentals/', size: uhaulSize  },
    { name:'Penske',  logo:'/Penske-Truck-logo.png',      total: penske.total, url:'https://www.pensketruckrental.com',    size: penSize    },
    { name:'Budget',  logo:'/budget-truck-1024x613.webp', total: budget.total, url:'https://www.budgettruck.com',          size: budgetSize },
  ].sort((a, b) => a.total - b.total);

  const moversMid = Math.round((estimate.low + estimate.high) / 2);
  const truckMid  = Math.round((truckLow + truckHigh) / 2);
  const savings   = moversMid - truckMid;
  const truckIsCheaper = savings > 0;

  return (
    <div className="space-y-6">
      {/* Route mini-map */}
      <div className="rounded-2xl overflow-hidden border border-slate-200">
        <div className="px-5 py-4 flex items-center gap-3 bg-slate-50 border-b border-slate-200">
          <Navigation className="w-4 h-4 text-teal-600" />
          <span className="text-sm font-semibold text-slate-700">
            {estimate.fromCity}, {estimate.fromState} → {estimate.toCity}, {estimate.toState} · {miles.toLocaleString()} miles
          </span>
        </div>
        <div className="h-56">
          <RouteMap
            fromLat={locationInfo.from.lat} fromLng={locationInfo.from.lng}
            toLat={locationInfo.to.lat} toLng={locationInfo.to.lng}
            fromLabel={`${estimate.fromCity}, ${estimate.fromState}`}
            toLabel={`${estimate.toCity}, ${estimate.toState}`}
            fuelRegions={[]}
          />
        </div>
      </div>

      {/* Comparison cards */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
            <Scale className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Movers vs. Renting a Truck</h3>
            <p className="text-xs text-slate-500">For your specific route and inventory size</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className={`rounded-2xl border-2 p-5 ${!truckIsCheaper ? 'border-teal-400 bg-teal-50/40' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center">
                <Users className="w-4 h-4 text-teal-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-sm">Professional Movers</p>
                <p className="text-xs text-slate-500">Full-service door-to-door</p>
              </div>
              {!truckIsCheaper && <span className="text-xs bg-teal-500 text-white font-semibold px-2 py-0.5 rounded-full">Best Value</span>}
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-3">${estimate.low.toLocaleString()}–${estimate.high.toLocaleString()}</div>
            <div className="space-y-1.5 text-xs text-slate-600 mb-4">
              <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-teal-500 shrink-0" />Loading, driving, unloading included</div>
              <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-teal-500 shrink-0" />No heavy lifting for you</div>
            </div>
            <button onClick={() => navigate('/')} className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5">
              Get a Quote <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className={`rounded-2xl border-2 p-5 ${truckIsCheaper ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Truck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-sm">Rent a Truck (DIY)</p>
                <p className="text-xs text-slate-500">U-Haul · Penske · Budget</p>
              </div>
              {truckIsCheaper && <span className="text-xs bg-emerald-500 text-white font-semibold px-2 py-0.5 rounded-full">Lowest Cost</span>}
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-3">${truckLow.toLocaleString()}–${truckHigh.toLocaleString()}</div>
            <div className="space-y-1.5 text-xs text-slate-600 mb-4">
              <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />You load and drive yourself</div>
              <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />Factor in 1–2 days of your time</div>
            </div>
            <button onClick={() => navigate('/rent-a-truck')} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5">
              Compare Prices <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {truckIsCheaper && (
          <div className="rounded-xl px-4 py-3 bg-emerald-50 border border-emerald-200 flex items-center gap-3 mb-4 text-sm">
            <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-slate-700">Renting a truck saves ~<strong className="text-emerald-700">${savings.toLocaleString()}</strong> on average for this route. Factor in your time and effort.</p>
          </div>
        )}

        <div className="space-y-2.5">
          {truckCompanies.map((c, i) => (
            <a key={c.name} href={c.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors group">
              <div className="w-14 h-7 bg-white rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 p-1">
                <img src={c.logo} alt={c.name} className="max-w-full max-h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-800 text-sm">{c.name}</span>
                  {i === 0 && <span className="text-xs bg-emerald-100 text-emerald-700 font-medium px-1.5 py-0.5 rounded-full">Lowest</span>}
                </div>
                <p className="text-xs text-slate-500">{c.size} · {miles.toLocaleString()} mi</p>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-slate-900">${c.total.toLocaleString()}</div>
                <div className="text-xs text-slate-400">est. total</div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 transition-colors shrink-0" />
            </a>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">Estimates include base rental, mileage, fuel, and taxes. Click to get a real quote.</p>
      </div>
    </div>
  );
}

// ─── SEO Content ─────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'How much space does my move take?',
    a: 'The space your move takes is measured in cubic feet (ft³). A studio apartment typically fills 250–450 ft³, a 1-bedroom 500–800 ft³, a 2-bedroom 800–1,200 ft³, a 3-bedroom 1,200–1,800 ft³, and a 4+ bedroom home 1,800–2,400+ ft³. Our inventory calculator lets you check off every item you plan to move so you get an exact cubic footage total rather than a rough bedroom-based guess. That total directly determines your truck size, moving cost, and whether your belongings fit in one load.',
  },
  {
    q: 'How does the inventory calculator work?',
    a: 'The inventory calculator provides two modes. The Quick Volume Estimator asks for your home size, furnishing level (minimal, average, well furnished, or heavy), property type, and optional garage or patio items, then calculates total cubic feet using AMSA-based density ratios. The Item-by-Item Inventory Builder lets you check off individual household items room by room — beds, sofas, tables, appliances, garage tools, patio furniture, and boxes — each with a known cubic-foot value. You can also add custom items. The calculator sums everything up, converts to an estimated weight at 7 lb/ft³, and recommends the right truck size.',
  },
  {
    q: 'Why is cubic footage more accurate than bedroom count for moving estimates?',
    a: 'Two 2-bedroom apartments can have wildly different contents. One might be minimally furnished with a mattress and a few boxes (350 ft³), while another is fully furnished with sectional sofas, a dining set, large dressers, and patio furniture (1,200 ft³). Pricing by bedroom count alone can overcharge light movers and undercharge heavy ones. By itemizing your actual belongings, the inventory calculator produces a volume-based estimate that reflects what the movers will actually load onto the truck, which is how most moving companies price long-distance moves.',
  },
  {
    q: 'What truck size do I need for my inventory?',
    a: 'Truck size is determined by total cubic feet. As a general guide: up to 400 ft³ fits a 10 ft truck or cargo van, 400–800 ft³ needs a 15 ft truck, 800–1,150 ft³ requires a 20 ft truck, 1,150–1,700 ft³ needs a 26 ft truck, and anything over 1,700 ft³ may require a 26 ft truck plus a trailer or a second load. The inventory calculator recommends the right truck automatically once you have checked your items.',
  },
  {
    q: 'How many boxes will I need for my move?',
    a: 'A typical studio needs 10–20 boxes, a 1-bedroom 20–40, a 2-bedroom 40–60, a 3-bedroom 60–80, and a 4+ bedroom 80–120. The inventory calculator includes a Boxes section where you can specify small (1.5 ft³), medium (3 ft³), large (5 ft³), and wardrobe (10 ft³) cartons. These are added to your total volume, so including them gives you a more accurate estimate of the space your move takes.',
  },
  {
    q: 'How is estimated weight calculated from my inventory?',
    a: 'We use the AMSA (American Moving & Storage Association) industry-standard density ratio of 7 pounds per cubic foot. Once the inventory calculator totals your cubic footage, it multiplies by 7 to estimate weight. For example, 1,000 ft³ of household goods translates to roughly 7,000 lbs. Weight matters because long-distance moving quotes are often based on either volume or weight, and having both numbers lets you compare apples to apples across carriers.',
  },
  {
    q: 'Can I use the inventory calculator to get a moving quote?',
    a: 'Yes. Once you have built your inventory and have a total cubic footage, click "Get Price Estimate" to enter your origin and destination ZIP codes, select optional services like packing or storage, choose a move date, and the calculator generates a price range based on your actual volume, distance, and regional rates. You can then submit your inventory and move details to receive quotes from moving companies.',
  },
  {
    q: 'Does the inventory calculator account for garage and outdoor items?',
    a: 'Yes. In Quick Volume Estimator mode, you can check Garage and Patio / Outdoor to add average cubic footage for those areas based on your home size. In Item-by-Item mode, dedicated Garage and Patio / Outdoor sections list common items like workbenches, lawnmowers, grills, patio sets, kayaks, trampolines, and storage deck boxes — each with a specific cubic-foot value so your total reflects everything you plan to move, not just interior rooms.',
  },
];

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: f.a,
    },
  })),
};

const VOLUME_TABLE = [
  { size: 'Studio',     cf: '250–450',    lbs: '1,750–3,150',   truck: '10 ft truck' },
  { size: '1 Bedroom',  cf: '500–800',    lbs: '3,500–5,600',   truck: '15 ft truck' },
  { size: '2 Bedroom',  cf: '800–1,200',  lbs: '5,600–8,400',   truck: '20 ft truck' },
  { size: '3 Bedroom', cf: '1,200–1,800', lbs: '8,400–12,600',  truck: '26 ft truck' },
  { size: '4+ Bedroom', cf: '1,800–2,400', lbs: '12,600–16,800', truck: '26 ft + trailer' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

function InventoryCalculator() {
  const [storageUnits, setStorageUnits] = useState<StorageUnit[]>(fallbackStorageUnits);
  const [inventorySnapshot, setInventorySnapshot] = useState<InventorySnapshot | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const quickEngineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('storage_units').select('*').order('sort_order', { ascending: true })
      .then(({ data }) => { if (data && data.length > 0) setStorageUnits(data); });
  }, []);

  const handleInventoryGetEstimate = (snapshot: InventorySnapshot) => {
    setInventorySnapshot(snapshot);
    setTimeout(() => quickEngineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Seo
        title="Inventory Calculator: How Much Space Does Your Move Take?"
        description="Free inventory calculator to find out how much space your move takes. Itemize household goods room by room, get exact cubic footage, truck size, and accurate moving quotes."
        canonical="/inventory-calculator"
        keywords="inventory calculator, how much space does your move take, moving inventory calculator, itemized moving list, cubic footage calculator, household inventory for moving"
        jsonLd={FAQ_SCHEMA}
      />
      <Header onAboutClick={() => {}} />
      <div className="pt-16 flex-1">
        <section className="relative overflow-hidden py-16 px-4">
          <img
            src="https://cdn.pixabay.com/photo/2026/09/01/00/24/00-24-52-122_1280.png"
            alt="Moving boxes and household inventory"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/50 to-green-800/40" />
          <div className="relative max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-emerald-600/30 rounded-full px-4 py-1.5 text-sm text-emerald-50 font-medium mb-4 backdrop-blur-sm ring-1 ring-emerald-300/30">
              <Package className="w-4 h-4" /> Volume-Based Estimator
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 drop-shadow-lg">How Much Space Does Your Move Take?</h1>
            <p className="text-white/90 text-base max-w-2xl mx-auto drop-shadow">
              Use the quick estimator for a fast quote, or build a detailed item inventory for a more accurate price.
            </p>
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-4 py-10 space-y-12">

          {/* Engine 1 */}
          <div ref={quickEngineRef}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-7 h-7 rounded-full bg-slate-800 text-white text-sm font-bold flex items-center justify-center shrink-0">1</div>
              <div>
                <h2 className="font-bold text-slate-800 text-lg leading-tight">Quick Estimate by Furnishing Level</h2>
                <p className="text-slate-500 text-sm">Best when you want a fast answer — 4 steps, takes about a minute</p>
              </div>
            </div>
            <QuickEstimatorEngine
              snapshot={inventorySnapshot}
              engineRef={quickEngineRef}
              onClearSnapshot={() => setInventorySnapshot(null)}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 border-t border-slate-200" />
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">or go item-by-item</span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          {/* Engine 2 */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-7 h-7 rounded-full bg-slate-600 text-white text-sm font-bold flex items-center justify-center shrink-0">2</div>
              <div>
                <h2 className="font-bold text-slate-800 text-lg leading-tight">Build Your Item Inventory</h2>
                <p className="text-slate-500 text-sm">Check each item you're moving for the most accurate volume and price</p>
              </div>
            </div>
            <InventoryEngine storageUnits={storageUnits} onGetEstimate={handleInventoryGetEstimate} />
          </div>
        </div>

        {/* ── SEO: How it works ── */}
        <section className="bg-white border-t border-slate-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-teal-50 rounded-full px-4 py-1.5 text-sm font-medium text-teal-700 mb-4">
                <Box className="w-4 h-4" />
                How the Inventory Calculator Works
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">Two Ways to Measure Your Move</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Whether you need a quick estimate or a precise item-by-item breakdown, the inventory calculator gives you the cubic footage that drives your moving cost.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="w-11 h-11 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                  <Clock className="w-5 h-5 text-teal-700" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Quick Volume Estimator</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Pick your home size (studio through 4+ bedroom), choose a furnishing level — minimal, average, well furnished, or heavy — and optionally add garage and patio items. The calculator applies AMSA density ratios to produce a cubic-foot total and weight estimate in under a minute.
                </p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                  <ClipboardList className="w-5 h-5 text-emerald-700" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Item-by-Item Inventory Builder</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Check off every item you plan to move, room by room — beds, sofas, tables, appliances, garage tools, patio furniture, and boxes. Adjust quantities, add custom items, and get an exact total. This is the most accurate way to determine how much space your move takes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SEO: Volume reference table ── */}
        <section className="bg-slate-50 border-t border-slate-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-blue-50 rounded-full px-4 py-1.5 text-sm font-medium text-blue-700 mb-4">
                <Ruler className="w-4 h-4" />
                Volume Reference Table
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">How Much Space Does Each Home Size Take?</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                These ranges are based on AMSA density standards (7 lb/ft³) and median home square footage data. Use them as a starting point, then refine with the item-by-item builder for your exact total.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Home Size</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Cubic Feet</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Est. Weight</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Truck Size</th>
                  </tr>
                </thead>
                <tbody>
                  {VOLUME_TABLE.map((row) => (
                    <tr key={row.size} className="border-b border-slate-100 hover:bg-white transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-800">{row.size}</td>
                      <td className="py-3 px-4 text-slate-600">{row.cf} ft³</td>
                      <td className="py-3 px-4 text-slate-600">{row.lbs} lbs</td>
                      <td className="py-3 px-4 text-teal-700 font-medium">{row.truck}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 mt-4 text-center">
              Weight estimated at 7 lb/ft³ per AMSA standards. Actual volume varies with furnishing level and items moved.
            </p>
          </div>
        </section>

        {/* ── SEO: Why volume matters ── */}
        <section className="bg-white border-t border-slate-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-emerald-50 rounded-full px-4 py-1.5 text-sm font-medium text-emerald-700 mb-4">
                <TrendingDown className="w-4 h-4" />
                Why Inventory Volume Matters
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">Accurate Volume Means Accurate Quotes</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Most moving companies price long-distance moves by cubic feet or weight. The more precisely you know your volume, the more accurate your quote — and the fewer surprise charges on moving day.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="w-11 h-11 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                  <DollarSign className="w-5 h-5 text-teal-700" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">Avoid Overpaying</h3>
                <p className="text-slate-600 text-sm leading-relaxed">Bedroom-count estimates can inflate your quote by 30–40% if your home is lightly furnished. Itemizing ensures you only pay for the space you actually use.</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                               <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                  <Truck className="w-5 h-5 text-amber-700" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">Right Truck, First Time</h3>
                <p className="text-slate-600 text-sm leading-relaxed">Ordering a truck that is too small means a second trip or leaving items behind. Too large and you pay for empty space. Exact volume picks the right size.</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <Database className="w-5 h-5 text-blue-700" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">No Surprise Charges</h3>
                <p className="text-slate-600 text-sm leading-relaxed">When movers arrive and your load is larger than estimated, they may charge more. An itemized inventory prevents day-of upcharges.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SEO: FAQ ── */}
        <section className="bg-slate-50 border-t border-slate-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-blue-50 rounded-full px-4 py-1.5 text-sm font-medium text-blue-700 mb-4">
                <HelpCircle className="w-4 h-4" />
                Frequently Asked Questions
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">Inventory Calculator Questions, Answered</h2>
              <p className="text-slate-600 max-w-xl mx-auto">
                Everything you need to know about measuring your move and getting accurate quotes from your inventory.
              </p>
            </div>
            <div className="space-y-3">
              {FAQS.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={faq.q} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
                    >
                      <h3 className="text-base font-semibold text-slate-900 pr-4">{faq.q}</h3>
                      {isOpen ? (
                        <Minus className="w-5 h-5 text-teal-600 flex-shrink-0" />
                      ) : (
                        <Plus className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5">
                        <p className="text-slate-600 text-sm leading-relaxed">{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}

export default InventoryCalculator;