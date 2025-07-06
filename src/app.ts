import GarageView from "@/views/GarageView";
import { WinnersView } from "@/views/WinnersView";
import { WinnersSortBy } from "@/types";
import RaceApi from "@/api/raceApi";

class App {
  private root: HTMLElement;
  private viewContainer: HTMLElement;
  private garageView = new GarageView();
  private winnersView = new WinnersView();
  private selectedCarId: number | null = null;

  constructor(rootId: string) {
    this.root = document.getElementById(rootId)!;
    this.renderBaseLayout();
    this.viewContainer = document.getElementById("view-container")!;
    this.setupNavigation();
    this.loadView("garage");
  }

  private renderBaseLayout(): void {
    this.root.innerHTML = `
      <header class="header">
        <nav class="nav">
          <button class="nav__btn active" data-view="garage">To Garage</button>
          <button class="nav__btn" data-view="winners">To Winners</button>
        </nav>
      </header>
      <main id="view-container" class="view-container"></main>
    `;
  }

  private setupNavigation(): void {
    document.querySelectorAll(".nav__btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const view = btn.getAttribute("data-view");
        if (view) {
          document
            .querySelectorAll(".nav__btn")
            .forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          this.loadView(view);
        }
      });
    });
  }

  private async loadView(viewName: string): Promise<void> {
    this.viewContainer.innerHTML = "";

    if (viewName === "garage") {
      const garageView = await this.garageView.render();
      this.viewContainer.appendChild(garageView);
      this.setupGarageEvents();

      // Reconnect race controls directly
      garageView
        .querySelector("#race-btn")
        ?.addEventListener("click", () => this.handleRaceAll());
      garageView
        .querySelector("#reset-btn")
        ?.addEventListener("click", () => this.handleResetAll());
    } else if (viewName === "winners") {
      const winnersView = await this.winnersView.render();
      this.viewContainer.appendChild(winnersView);
    }
  }

  private setupWinnersEvents(): void {
    // Pagination
    document.getElementById("winners-prev")?.addEventListener("click", () => {
      this.winnersView.prevPage();
      this.loadView("winners");
    });

    document.getElementById("winners-next")?.addEventListener("click", () => {
      this.winnersView.nextPage();
      this.loadView("winners");
    });

    // Sorting
    document.querySelectorAll(".sortable").forEach((header) => {
      header.addEventListener("click", () => {
        const sortBy = header.getAttribute("data-sort") as WinnersSortBy;
        this.winnersView.setSort(sortBy);
        this.loadView("winners");
      });
    });
  }

  private setupGarageEvents(): void {
    try {
      document
        .getElementById("create-btn")
        ?.addEventListener("click", this.handleCreateCar.bind(this));
      document
        .getElementById("update-btn")
        ?.addEventListener("click", this.handleUpdateCar.bind(this));

      let timeoutId: NodeJS.Timeout;
      const handlePagination = async (direction: "prev" | "next") => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          if (direction === "prev") {
            await this.garageView.prevPage();
          } else {
            await this.garageView.nextPage();
          }
          await this.loadView("garage");
        }, 300);
      };

      document
        .getElementById("prev-btn")
        ?.addEventListener("click", () => handlePagination("prev"));
      document
        .getElementById("next-btn")
        ?.addEventListener("click", () => handlePagination("next"));
      document
        .getElementById("generate-btn")
        ?.addEventListener("click", this.handleGenerateCars.bind(this));
      document;

      // Car-specific controls delegation
      this.viewContainer.addEventListener("click", async (e) => {
        const target = e.target as HTMLElement;
        if (!target.dataset.carId) return;

        const carId = Number(target.dataset.carId);
        if (target.classList.contains("select-btn")) {
          this.handleSelectCar(carId);
        } else if (target.classList.contains("delete-btn")) {
          await this.handleDeleteCar(carId);
        }
      });
    } catch (error) {
      console.error("Failed to set up garage events:", error);
    }
  }

  private async handleCreateCar(): Promise<void> {
    const nameInput = document.getElementById(
      "create-name"
    ) as HTMLInputElement;
    const colorInput = document.getElementById(
      "create-color"
    ) as HTMLInputElement;

    if (!nameInput.value.trim()) {
      alert("Please enter a car name");
      return;
    }

    try {
      await RaceApi.createCar({
        name: nameInput.value.trim(),
        color: colorInput.value,
      });
      nameInput.value = "";
      colorInput.value = "#ff0000";
      await this.loadView("garage");
    } catch (error) {
      console.error("Failed to create car:", error);
      alert("Failed to create car");
    }
  }

  private handleSelectCar(carId: number): void {
    this.selectedCarId = carId;
    const car = this.garageView.getCar(carId);
    if (car) {
      const updateNameInput = document.getElementById(
        "update-name"
      ) as HTMLInputElement;
      const updateColorInput = document.getElementById(
        "update-color"
      ) as HTMLInputElement;
      const updateBtn = document.getElementById(
        "update-btn"
      ) as HTMLButtonElement;

      updateNameInput.value = car.name;
      updateColorInput.value = car.color;
      updateBtn.disabled = false;
    }
  }

  private async handleDeleteCar(carId: number): Promise<void> {
    try {
      const response = await RaceApi.deleteCar(carId);

      if (response.ok) {
        if (this.selectedCarId === carId) {
          this.resetUpdateForm();
        }

        const carsBeforeDelete = this.garageView.getCurrentPageCars().length;
        this.garageView.removeCar(carId);

        // Only reload if page becomes empty
        if (carsBeforeDelete === 1) {
          const prevPage = this.garageView.getCurrentPage() > 1;
          if (prevPage) {
            await this.garageView.prevPage();
          }
          await this.loadView("garage");
        }
      }
    } catch (error) {
      console.error("Failed to delete car:", error);
      alert("Failed to delete car. Please try again.");
    }
  }

  private resetUpdateForm(): void {
    const updateNameInput = document.getElementById(
      "update-name"
    ) as HTMLInputElement;
    const updateColorInput = document.getElementById(
      "update-color"
    ) as HTMLInputElement;
    const updateBtn = document.getElementById(
      "update-btn"
    ) as HTMLButtonElement;

    updateNameInput.value = "";
    updateColorInput.value = "#ff0000";
    updateBtn.disabled = true;
    this.selectedCarId = null;
  }

  private async handleUpdateCar(): Promise<void> {
    if (!this.selectedCarId) return;

    const nameInput = document.getElementById(
      "update-name"
    ) as HTMLInputElement;
    const colorInput = document.getElementById(
      "update-color"
    ) as HTMLInputElement;

    if (!nameInput.value.trim()) {
      alert("Please enter a car name");
      return;
    }

    try {
      await RaceApi.updateCar(this.selectedCarId, {
        name: nameInput.value.trim(),
        color: colorInput.value,
      });
      this.resetUpdateForm();
      await this.loadView("garage");
    } catch (error) {
      console.error("Failed to update car:", error);
      alert("Failed to update car");
    }
  }

  private async handleRaceAll(): Promise<void> {
    try {
      await this.garageView.startRace();
    } catch (error) {
      console.error("Race failed:", error);
    }
  }

  private async handleResetAll(): Promise<void> {
    this.garageView.resetRace();
  }

  private async handleGenerateCars(): Promise<void> {
    try {
      const generateBtn = document.getElementById(
        "generate-btn"
      ) as HTMLButtonElement;
      generateBtn.disabled = true;
      generateBtn.textContent = "Generating...";

      await RaceApi.generateRandomCars(100);
      await this.loadView("garage");

      generateBtn.disabled = false;
      generateBtn.textContent = "Generate Cars";
    } catch (error) {
      console.error("Failed to generate cars:", error);
      alert("Failed to generate cars");
    }
  }
}

export default App;
