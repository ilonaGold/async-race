// Base Interfaces

export interface Car {
  id: number;
  name: string;
  color: string;
}

export interface EngineResponse {
  velocity: number;
  distance: number;
}

// Winner Types
export interface Winner {
  id: number;
  wins: number;
  time: number;
}

export interface WinnerWithCar extends Winner {
  car: Car;
}

// API Response Types
export interface PaginatedWinners {
  items: Winner[];
  count: number;
}

export interface PaginatedCars {
  items: Car[];
  count: number;
}

// Sorting Types
export type WinnersSortBy = "wins" | "time";
export type SortOrder = "ASC" | "DESC";

// Engine Status - Union type
export type EngineStatus = "started" | "stopped" | "drive";
