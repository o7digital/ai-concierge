import { DEFAULT_CURRENCY, HOTEL_NAME } from "../../config/settings.js";

const CHECK_IN_TIME = "15:00";
const CHECK_OUT_TIME = "12:00";

const ROOMS = [
  {
    id: "junior-suite",
    name: "Junior Suite",
    description:
      "Spacious suite with king bed, private balcony, and city views.",
    maxGuests: 2,
    beds: "1 king",
    sizeSqm: 42,
    amenities: ["Balcony", "Rain shower", "Smart TV", "Nespresso"],
    baseNightlyRate: 3200,
  },
  {
    id: "master-suite",
    name: "Master Suite",
    description:
      "Premium suite with separate lounge, king bed, and soaking tub.",
    maxGuests: 3,
    beds: "1 king + sofa bed",
    sizeSqm: 58,
    amenities: ["Lounge", "Soaking tub", "Workspace", "Smart TV"],
    baseNightlyRate: 4200,
  },
  {
    id: "family-suite",
    name: "Family Suite",
    description:
      "Two-room suite ideal for families, with kitchenette and dining area.",
    maxGuests: 4,
    beds: "1 king + 2 twins",
    sizeSqm: 70,
    amenities: ["Kitchenette", "Dining area", "Microwave", "Smart TV"],
    baseNightlyRate: 5200,
  },
  {
    id: "penthouse-suite",
    name: "Penthouse Suite",
    description:
      "Top-floor suite with panoramic terrace and premium amenities.",
    maxGuests: 2,
    beds: "1 king",
    sizeSqm: 85,
    amenities: ["Terrace", "Premium bar", "City skyline view", "Smart TV"],
    baseNightlyRate: 7500,
  },
];

const BASE_INVENTORY = {
  "junior-suite": 4,
  "master-suite": 3,
  "family-suite": 2,
  "penthouse-suite": 1,
};

const CANCELLATION_POLICY =
  "Free cancellation up to 48h before arrival. After that, first night is charged.";

const PAYMENT_POLICY = "50% deposit at booking, balance due at check-in.";

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function nightsBetween(checkInDate, checkOutDate) {
  const msPerNight = 1000 * 60 * 60 * 24;
  const diffMs = checkOutDate - checkInDate;
  const nights = Math.ceil(diffMs / msPerNight);
  return nights > 0 ? nights : null;
}

function getSeasonMultiplier(date) {
  const month = date.getMonth() + 1;
  if ([12, 1, 2].includes(month)) return 1.25;
  if ([3, 4].includes(month)) return 1.1;
  if ([9, 10, 11].includes(month)) return 0.95;
  return 1;
}

function getWeekendMultiplier(date) {
  const day = date.getDay();
  return day === 5 || day === 6 ? 1.1 : 1;
}

function buildRate(room, checkInDate) {
  const season = getSeasonMultiplier(checkInDate);
  const weekend = getWeekendMultiplier(checkInDate);
  const rate = Math.round(room.baseNightlyRate * season * weekend);
  return rate;
}

export async function getRooms() {
  return {
    ok: true,
    hotel: HOTEL_NAME,
    currency: DEFAULT_CURRENCY,
    rooms: ROOMS.map((room) => ({
      id: room.id,
      name: room.name,
      description: room.description,
      maxGuests: room.maxGuests,
      beds: room.beds,
      sizeSqm: room.sizeSqm,
      amenities: room.amenities,
      baseNightlyRate: room.baseNightlyRate,
    })),
  };
}

export async function getPolicies() {
  return {
    ok: true,
    hotel: HOTEL_NAME,
    checkInTime: CHECK_IN_TIME,
    checkOutTime: CHECK_OUT_TIME,
    cancellationPolicy: CANCELLATION_POLICY,
    paymentPolicy: PAYMENT_POLICY,
    pets: "Pets allowed in select suites with advance notice.",
    children: "Children welcome; extra beds available on request.",
  };
}

export async function getAvailability({ checkIn, checkOut, guests } = {}) {
  const missingFields = [];
  if (!checkIn) missingFields.push("checkIn");
  if (!checkOut) missingFields.push("checkOut");

  if (missingFields.length > 0) {
    return { ok: false, missingFields };
  }

  const checkInDate = parseDate(checkIn);
  const checkOutDate = parseDate(checkOut);
  const nights = checkInDate && checkOutDate ? nightsBetween(checkInDate, checkOutDate) : null;

  if (!checkInDate || !checkOutDate || !nights) {
    return { ok: false, error: "invalid_dates" };
  }

  const requestedGuests = Number.isFinite(Number(guests)) ? Number(guests) : null;
  const isWeekend = checkInDate.getDay() === 5 || checkInDate.getDay() === 6;

  const availableRooms = ROOMS.filter((room) => {
    if (!requestedGuests) return true;
    return requestedGuests <= room.maxGuests;
  }).map((room) => {
    const baseInventory = BASE_INVENTORY[room.id] ?? 0;
    const availability = Math.max(0, baseInventory - (isWeekend ? 1 : 0));
    const ratePerNight = buildRate(room, checkInDate);
    return {
      roomType: room.name,
      roomId: room.id,
      availableRooms: availability,
      ratePerNight,
      total: ratePerNight * nights,
    };
  });

  return {
    ok: true,
    hotel: HOTEL_NAME,
    currency: DEFAULT_CURRENCY,
    checkIn,
    checkOut,
    nights,
    guests: requestedGuests,
    checkInTime: CHECK_IN_TIME,
    checkOutTime: CHECK_OUT_TIME,
    rooms: availableRooms,
  };
}

export async function getPricing({ roomType, checkIn, checkOut, guests } = {}) {
  const checkInDate = parseDate(checkIn);
  const checkOutDate = parseDate(checkOut);
  const nights = checkInDate && checkOutDate ? nightsBetween(checkInDate, checkOutDate) : null;
  const requestedGuests = Number.isFinite(Number(guests)) ? Number(guests) : null;

  const filteredRooms = roomType
    ? ROOMS.filter((room) => room.name.toLowerCase() === roomType.toLowerCase())
    : ROOMS;

  const pricing = filteredRooms.map((room) => {
    const ratePerNight = checkInDate ? buildRate(room, checkInDate) : room.baseNightlyRate;
    const total = nights ? ratePerNight * nights : null;
    return {
      roomType: room.name,
      roomId: room.id,
      ratePerNight,
      total,
      maxGuests: room.maxGuests,
    };
  });

  return {
    ok: true,
    hotel: HOTEL_NAME,
    currency: DEFAULT_CURRENCY,
    checkIn,
    checkOut,
    nights,
    guests: requestedGuests,
    pricing,
  };
}
