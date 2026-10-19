export type VehicleType = 'taxi' | 'tuktuk' | 'scooter' | 'sedan';

export type TimeOfDay = 'day' | 'sunset' | 'night';

export type WeatherType = 'clear' | 'cloudy' | 'rainy';

export type MissionType = 'taxi_passenger' | 'tuktuk_rush' | 'food_delivery';

export interface Location3D {
  nameAr: string;
  x: number;
  z: number;
}

export interface Mission {
  id: string;
  titleAr: string;
  descriptionAr?: string;
  descAr?: string;
  type: MissionType;
  passengerNameAr?: string;
  passengerName?: string;
  passengerDialogue: string;
  startLocation: Location3D;
  targetLocation: Location3D;
  baseFare?: number;
  maxTip?: number;
  reward?: number;
  xpReward: number;
  timeLimitSeconds: number;
  requiredVehicleType?: VehicleType;
  allowedVehicle?: VehicleType | 'any';
}

export interface VehicleConfig {
  id: VehicleType;
  nameAr: string;
  nameEn?: string;
  descriptionAr: string;
  maxSpeedKmh: number;
  maxSpeed?: number;
  acceleration: number;
  brakePower: number;
  braking?: number;
  handling: number;
  handlingLevel?: number;
  price: number;
  primaryColor: string;
  isUnlocked: boolean;
  unlocked?: boolean;
  engineLevel: number;
  brakesLevel: number;
  armorLevel: number;
}

export interface PlayerStats {
  totalTripsCompleted: number;
  totalEarnings: number;
  distanceDrivenMeters: number;
  crashesCount: number;
  passengerRatingAverage: number;
}

export interface Landmark {
  id: string;
  nameAr: string;
  x: number;
  z: number;
  color: string;
  icon: string;
}

// Card game backward compatibility definitions if needed by admin modules
export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export interface Card { suit: Suit; rank: Rank; value: number; }
export type HandType = 'Trail' | 'Pure Sequence' | 'Sequence' | 'Color' | 'Pair' | 'High Card';
export interface HandEvaluation { type: HandType; score: number; rankName: string; cards: Card[]; description: string; }
export interface Player { id: string; name: string; avatar: string; seatIndex: number; chips: number; currentBet: number; cards: Card[]; hasFolded: boolean; isAutoPlay: boolean; isBot: boolean; isReady: boolean; lastReaction?: 'win' | 'lose' | 'draw' | 'idle'; }
export type SpotId = 'A' | 'B' | 'C';
export interface TableSpot { id: SpotId; pot: number; cards: Card[]; evaluation?: HandEvaluation; isWinner?: boolean; }
export type RoundPhase = 'COUNTDOWN' | 'DEALING' | 'SHOWDOWN' | 'RESULTS';
export interface TableState { id: string; name: string; maxPlayers: number; minBet: number; maxBet: number; availableChips: number[]; players: (Player | null)[]; spots: Record<SpotId, TableSpot>; userBets: Record<SpotId, number>; totalPot: number; phase: RoundPhase; timerRemaining: number; timerTotal: number; roundNumber: number; winningSpot?: SpotId; isGameActive: boolean; [key: string]: any; }
export interface GameHistoryEntry { id: string; roundNumber: number; timestamp: number; totalPot: number; winningSpot: SpotId; winningHandName: string; spotsSummary: any[]; }
export interface GameWinRates { global: number; teenPatti: number; rocketCrash: number; mines: number; horseRacing: number; happyCake: number; luckySeven: number; dragonTiger: number; }
export interface AdminConfig { isGameEnabled: boolean; defaultChips: number[]; roundCountdownSeconds: number; minBet: number; maxBet: number; autoFillBots: boolean; defaultPlayerBalance: number; coinsPerUsdRecharge: number; coinsPerUsdWithdraw: number; minWithdrawCoins: number; globalWinRate: number; gameWinRates: GameWinRates; houseMode: string; }
export interface UserProfile { userId: string; customId: string; email: string; displayName: string; role: string; balance: number; [key: string]: any; }
export interface WithdrawalRequest { id: string; userId: string; customId: string; userName: string; userEmail: string; coinsAmount: number; usdAmount: number; paymentMethod: string; accountDetails: string; recipientName: string; status: string; createdAt: string; notes?: string; }
export interface GiftItem { id: string; name: string; icon: string; coins: number; description: string; }
export interface ChatMessage { id: string; senderId: string; senderCustomId: string; senderName: string; senderRole: string; content: string; type: string; timestamp: number; gift?: any; }
