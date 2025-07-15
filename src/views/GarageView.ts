import RaceApi from "@/api/raceApi";
import { Car } from "@/types";
import { CarAnimation } from "@/components/car/carAnimation";

class GarageView {
  private isLoading = false;
  private currentPage = 1;
  private cars: Car[] = [];
  private carAnimations: Map<number, CarAnimation> = new Map();
  private readonly TRACK_LENGTH = 1000;
  private totalCars = 0;
  private readonly carsPerPage = 7;
  private isRacing = false;
  private currentOverlay: HTMLDivElement | null = null;

  public getCar(id: number): Car | undefined {
    return this.cars.find((car) => car.id === id);
  }

  public getCurrentPageCars(): Car[] {
    return this.cars;
  }

  private renderCreateForm(): string {
    return `
      <div class="create-form">
        <input type="text" id="create-name" placeholder="Car name" required>
        <input type="color" id="create-color" value="#ff0000">
        <button id="create-btn">Create</button>
      </div>
    `;
  }

  private renderUpdateForm(): string {
    return `
      <div class="update-form">
        <input type="text" id="update-name" placeholder="Car name" required>
        <input type="color" id="update-color" value="#ff0000">
        <button id="update-btn" disabled>Update</button>
      </div>
    `;
  }

  private renderRaceControls(): string {
    return `
      <div class="race-controls">
        <button id="race-btn">Race All</button>
        <button id="reset-btn" disabled>Reset All</button>
        <button id="generate-btn">Generate Cars</button>
      </div>
    `;
  }

  private renderPagination(): string {
    const hasNextPage = this.currentPage * this.carsPerPage < this.totalCars;
    return `
      <div class="pagination">
        <button id="prev-btn" ${this.currentPage === 1 ? "disabled" : ""}>← Prev</button>
        <span id="page-num">Page #${this.currentPage}</span>
        <button id="next-btn" ${!hasNextPage ? "disabled" : ""}>Next →</button>
      </div>
    `;
  }

  public async render(): Promise<HTMLElement> {
    this.cleanupAnimations();
    const container = document.createElement("div");
    container.className = "garage-container";

    // Create loader
    const loader = document.createElement("div");
    loader.className = "garage-loader";
    loader.innerHTML = `
      <div class="garage-loader-content">
        <div class="spinning-cog-fallback">⚙️</div>
        <div class="garage-loader-text">Warming up the engines...</div>
      </div>
    `;
    container.appendChild(loader);

    this.isLoading = true;
    loader.style.display = "flex";

    try {
      const { cars, total } = await RaceApi.getCars(
        this.currentPage,
        this.carsPerPage
      );
      this.cars = cars;
      this.totalCars = total;

      this.isLoading = false;
      loader.style.display = "none";

      // Append controls, header, pagination, and tracks as elements
      const controls = document.createElement("div");
      controls.className = "controls";
      controls.innerHTML =
        this.renderCreateForm() +
        this.renderUpdateForm() +
        this.renderRaceControls();
      container.appendChild(controls);

      const h2 = document.createElement("h2");
      h2.textContent = `Garage (${this.totalCars})`;
      container.appendChild(h2);

      const pagination = document.createElement("div");
      pagination.innerHTML = this.renderPagination();
      container.appendChild(pagination.firstElementChild!);

      const tracks = document.createElement("div");
      tracks.className = "tracks";
      tracks.innerHTML = this.cars
        .map((car) => this.renderCarTrack(car))
        .join("");
      container.appendChild(tracks);

      // Race controls event listeners
      container
        .querySelector("#race-btn")
        ?.addEventListener("click", () => this.startRace());
      container
        .querySelector("#reset-btn")
        ?.addEventListener("click", () => this.resetRace());
    } catch (error) {
      this.isLoading = false;
      loader.style.display = "none";
      console.error("Error loading garage:", error);
      const errorMsg = document.createElement("p");
      errorMsg.textContent = "Error loading garage data";
      container.appendChild(errorMsg);
    }

    container.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const carId = Number(target.getAttribute("data-car-id"));

      if (target.classList.contains("start-btn")) {
        this.startCar(carId);
      } else if (target.classList.contains("stop-btn")) {
        this.stopCar(carId);
      }
    });

    return container;
  }

  // Clean up animations when the view is removed
  private cleanupAnimations(): void {
    this.carAnimations.forEach((animation) => animation.stop());
    this.carAnimations.clear();
  }

  private renderCarTrack(car: Car): string {
    // Clean up existing animation if any
    const existingAnimation = this.carAnimations.get(car.id);
    if (existingAnimation) {
      existingAnimation.stop();
      this.carAnimations.delete(car.id);
    }

    const track = `
      <div class="track" data-car-id="${car.id}">
        <div class="car-controls">
          <button class="select-btn" data-car-id="${car.id}">Select</button>
          <button class="start-btn" data-car-id="${car.id}">Start</button>
          <button class="stop-btn" data-car-id="${car.id}" disabled>Stop</button>
          <button class="delete-btn" data-car-id="${car.id}">Remove</button>
          <span class="car-name">${car.name}</span>
        </div>
        <div class="car" style="color: ${car.color}">
          ${this.getCarSVG()}
        </div>
        <div class="finish-line"></div>
      </div>
    `;

    // Initialize animation after rendering
    setTimeout(() => {
      const carElement = document.querySelector(
        `[data-car-id="${car.id}"] .car`
      );
      if (carElement instanceof HTMLElement) {
        const trackElement = carElement.closest(".track");
        const finishElement = trackElement?.querySelector(".finish-line");
        const initialLength = finishElement
          ? finishElement.getBoundingClientRect().left -
            carElement.getBoundingClientRect().left
          : this.TRACK_LENGTH;

        this.carAnimations.set(
          car.id,
          new CarAnimation(carElement, car, initialLength)
        );
      }
    }, 0);

    return track;
  }

  private getCarSVG(): string {
    return `<svg width="100" height="40" viewBox="0 0 100 40">
      <rect x="10" y="15" width="80" height="10" fill="currentColor"/>
      <rect x="20" y="5" width="60" height="10" fill="currentColor"/>
      <circle cx="25" cy="30" r="5" fill="#333"/>
      <circle cx="75" cy="30" r="5" fill="#333"/>
    </svg>`;
  }

  public async nextPage(): Promise<void> {
    const nextPage = this.currentPage + 1;
    const { cars, total } = await RaceApi.getCars(nextPage, this.carsPerPage);

    if (nextPage * this.carsPerPage <= total) {
      this.currentPage = nextPage;
      this.cars = cars;
      this.totalCars = total;
    }
  }

  public async prevPage(): Promise<void> {
    if (this.currentPage > 1) {
      this.currentPage--;
      const { cars, total } = await RaceApi.getCars(
        this.currentPage,
        this.carsPerPage
      );
      this.cars = cars;
      this.totalCars = total;
    }
  }

  public getCurrentPage(): number {
    return this.currentPage;
  }

  public removeCar(id: number): void {
    const index = this.cars.findIndex((car) => car.id === id);
    if (index === -1) return;

    // Update state
    this.cars.splice(index, 1);
    this.totalCars--;

    // Update UI directly
    const carElement = document.querySelector(`[data-car-id="${id}"]`);
    if (carElement) {
      carElement.remove();
    }

    // Update garage count
    const garageCount = document.querySelector("h2");
    if (garageCount) {
      garageCount.textContent = `Garage (${this.totalCars})`;
    }

    // Update pagination buttons state
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    if (prevBtn) {
      (prevBtn as HTMLButtonElement).disabled = this.currentPage === 1;
    }
    if (nextBtn) {
      (nextBtn as HTMLButtonElement).disabled =
        this.currentPage * this.carsPerPage >= this.totalCars;
    }
  }

  private tracksContainer: HTMLElement | null = null;

  private updateTracksDisplay(): void {
    this.tracksContainer = document.querySelector(".tracks");
    if (this.tracksContainer) {
      this.tracksContainer.innerHTML = this.cars
        .map((car: Car) => this.renderCarTrack(car))
        .join("");
    }
  }

  public async startCar(id: number): Promise<void> {
    const animation = this.carAnimations.get(id);
    if (animation) {
      const startBtn = document.querySelector(
        `[data-car-id="${id}"] .start-btn`
      ) as HTMLButtonElement;
      const stopBtn = document.querySelector(
        `[data-car-id="${id}"] .stop-btn`
      ) as HTMLButtonElement;

      startBtn.disabled = true;
      stopBtn.disabled = false;

      await animation.start();
    }
  }

  public stopCar(id: number): void {
    const animation = this.carAnimations.get(id);
    if (animation) {
      const startBtn = document.querySelector(
        `[data-car-id="${id}"] .start-btn`
      ) as HTMLButtonElement;
      const stopBtn = document.querySelector(
        `[data-car-id="${id}"] .stop-btn`
      ) as HTMLButtonElement;

      startBtn.disabled = false;
      stopBtn.disabled = true;

      animation.stop();
    }
  }

  public async startRace(): Promise<void> {
    if (this.isRacing) return;
    // Clean up any existing overlay without resetting race
    this.removeOverlay(false);
    this.isRacing = true;

    // Disable race button and enable reset
    const raceBtn = document.getElementById("race-btn") as HTMLButtonElement;
    const resetBtn = document.getElementById("reset-btn") as HTMLButtonElement;
    if (raceBtn) raceBtn.disabled = true;
    if (resetBtn) resetBtn.disabled = false;

    // Start all cars simultaneously
    const racePromises = this.cars.map((car) => {
      const animation = this.carAnimations.get(car.id);
      if (animation) {
        // Disable individual car controls during race
        const startBtn = document.querySelector(
          `[data-car-id="${car.id}"] .start-btn`
        ) as HTMLButtonElement;
        const stopBtn = document.querySelector(
          `[data-car-id="${car.id}"] .stop-btn`
        ) as HTMLButtonElement;

        if (startBtn) startBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = false;

        return animation.start();
      }
      return Promise.resolve();
    });

    try {
      // Start all animations
      await Promise.race(racePromises);

      // Check for winner periodically
      const winner = await new Promise<Car | undefined>((resolve) => {
        const checkWinner = () => {
          const winningCar = this.cars.find((car) => {
            const animation = this.carAnimations.get(car.id);
            return animation?.hasFinished();
          });

          if (winningCar) {
            resolve(winningCar);
          } else if (this.isRacing) {
            setTimeout(checkWinner, 100); // Check every 100ms
          } else {
            resolve(undefined);
          }
        };
        checkWinner();
      });

      if (winner) {
        this.announceWinner(winner);
      }
    } catch (error) {
      console.error("Race error:", error);
    }
  }

  public resetRace(): void {
    if (this.isRacing) {
      this.isRacing = false;

      // Enable race button and disable reset
      const raceBtn = document.getElementById("race-btn") as HTMLButtonElement;
      const resetBtn = document.getElementById(
        "reset-btn"
      ) as HTMLButtonElement;
      if (raceBtn) raceBtn.disabled = false;
      if (resetBtn) resetBtn.disabled = true;

      // Stop all cars
      this.cars.forEach((car) => {
        const animation = this.carAnimations.get(car.id);
        if (animation) {
          animation.stop(false); // Pass false to keep position
        }
      });
    }
  }

  private async announceWinner(winner: Car): Promise<void> {
    try {
      // Calculate race time (simplified - in a real app actual time will be tracked)
      const raceTime = Math.random() * 5 + 1; // Random time between 1-6 seconds

      // Save winner data
      await RaceApi.saveWinner({
        id: winner.id,
        wins: 1,
        time: parseFloat(raceTime.toFixed(2)),
      });
      // Create winner announcement overlay
      const overlay = document.createElement("div");
      overlay.className = "winner-overlay visible";
      overlay.innerHTML = `
      <div class="winner-modal">
        <h2>🏆 Winner!</h2>
        <div class="winner-car" style="color: ${winner.color}">
          ${this.getCarSVG()}
        </div>
        <p>${winner.name}</p>
        <button class="close-btn">Close</button>
      </div>
    `;

      this.currentOverlay = overlay; // Store the current overlay
      document.body.appendChild(overlay);

      overlay.querySelector(".close-btn")?.addEventListener("click", () => {
        this.removeOverlay(); // Don't reset race when closing
      });
    } catch (error) {
      console.error("Failed to save winner:", error);
    }
  }

  private removeOverlay(shouldResetRace: boolean = true): void {
    if (this.currentOverlay) {
      this.currentOverlay.remove();
      this.currentOverlay = null;
    }
    if (shouldResetRace) {
      this.resetRace();
    }
  }
}

export default GarageView;
