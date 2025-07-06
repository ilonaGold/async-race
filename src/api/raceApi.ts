import {
  Car,
  EngineResponse,
  Winner,
  WinnersSortBy,
  SortOrder,
  PaginatedWinners,
} from "@/types";

export default class RaceApi {
  private static readonly BASE_URL = "http://localhost:3000";
  // Get cars with pagination
  static async getCars(
    page: number,
    limit = 7
  ): Promise<{ cars: Car[]; total: number }> {
    const response = await fetch(
      `${RaceApi.BASE_URL}/garage?_page=${page}&_limit=${limit}`
    );

    if (!response.ok)
      throw new Error(`Failed to fetch cars: ${response.status}`);

    // First get all cars to determine total count
    const allCarsResponse = await fetch(`${RaceApi.BASE_URL}/garage`);
    const allCars = await allCarsResponse.json();

    return {
      cars: await response.json(),
      total: allCars.length, // Use actual count from full response
    };
  }

  // Get car by ID
  static async getCarById(id: number): Promise<Car> {
    const response = await fetch(`${RaceApi.BASE_URL}/garage/${id}`);
    if (!response.ok) throw new Error(`Car ${id} not found`);
    return response.json();
  }

  // Create car
  static async createCar(car: Omit<Car, "id">): Promise<Car> {
    const response = await fetch(`${RaceApi.BASE_URL}/garage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(car),
    });
    return response.json();
  }

  // Remove car
  static async deleteCar(carId: number): Promise<Response> {
    const response = await fetch(`${RaceApi.BASE_URL}/garage/${carId}`, {
      method: "DELETE",
    });
    return response;
  }

  // Update car
  static async updateCar(id: number, car: Partial<Car>): Promise<Car> {
    const response = await fetch(`${RaceApi.BASE_URL}/garage/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(car),
    });
    return response.json();
  }

  // Start/stop engine
  static async controlEngine(
    id: number,
    status: "started" | "stopped"
  ): Promise<EngineResponse> {
    const response = await fetch(
      `${RaceApi.BASE_URL}/engine?id=${id}&status=${status}`,
      { method: "PATCH" }
    );
    return response.json();
  }

  // Drive mode
  static async switchToDrive(id: number): Promise<{ success: boolean }> {
    const response = await fetch(
      `${RaceApi.BASE_URL}/engine?id=${id}&status=drive`,
      {
        method: "PATCH",
      }
    );
    return response.json();
  }

  // Winners API
  static async getWinners(
    page: number,
    limit = 10,
    sort: WinnersSortBy,
    order: SortOrder
  ): Promise<PaginatedWinners> {
    const response = await fetch(
      `${RaceApi.BASE_URL}/winners?_page=${page}&_limit=${limit}&_sort=${sort}&_order=${order}`
    );
    if (!response.ok) {
      return { items: [], count: 0 }; // Return empty state instead of throwing
    }
    const items = await response.json();
    const count = Number(response.headers.get("X-Total-Count")) || 0;
    console.log("API Response:", { items, count }); // Debug log
    return { items, count };
  }

  static async getWinner(id: number): Promise<Winner | null> {
    const response = await fetch(`${this.BASE_URL}/winners/${id}`);
    if (response.status === 404) return null;
    return response.json();
  }

  public static async saveWinner(winner: Winner): Promise<void> {
    try {
      // First try to get existing winner
      const existingWinner = await this.getWinner(winner.id).catch(() => null);

      if (existingWinner) {
        // Update existing winner
        await this.updateWinner(winner.id, {
          wins: existingWinner.wins + 1,
          time: Math.min(existingWinner.time, winner.time),
        });
      } else {
        // Create new winner
        await this.createWinner({
          id: winner.id,
          wins: 1,
          time: winner.time,
        });
      }
    } catch (error) {
      console.error("Failed to save winner:", error);
      throw error;
    }
  }

  private static async createWinner(winner: Winner): Promise<Winner> {
    const response = await fetch(`${this.BASE_URL}/winners`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(winner),
    });

    if (!response.ok) {
      throw new Error(`Failed to create winner: ${response.statusText}`);
    }

    return response.json();
  }

  private static async updateWinner(
    id: number,
    data: Partial<Winner>
  ): Promise<Winner> {
    const response = await fetch(`${this.BASE_URL}/winners/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update winner: ${response.statusText}`);
    }

    return response.json();
  }
  static async deleteWinner(id: number): Promise<void> {
    await fetch(`${RaceApi.BASE_URL}/winners/${id}`, { method: "DELETE" });
  }

  static async generateRandomCars(count: number): Promise<Car[]> {
    const carData = Array.from({ length: count }, () => ({
      name: this.getRandomCarName(),
      color: this.getRandomColor(),
    }));

    const promises = carData.map((car) => this.createCar(car));
    return Promise.all(promises);
  }

  private static getRandomCarName(): string {
    const brands = [
      "Tesla",
      "Ford",
      "Porsche",
      "BMW",
      "Audi",
      "Mercedes",
      "Toyota",
    ];
    const models = [
      "Model S",
      "Mustang",
      "911",
      "M5",
      "A4",
      "C-Class",
      "Supra",
    ];
    return `${brands[Math.floor(Math.random() * brands.length)]} ${
      models[Math.floor(Math.random() * models.length)]
    }`;
  }
  private static getRandomColor(): string {
    return `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")}`;
  }
}
