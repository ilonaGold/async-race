import { Car, Winner, WinnerWithCar, WinnersSortBy, SortOrder } from "@/types";
import RaceApi from "@/api/raceApi";

export class WinnersView {
  private winners: WinnerWithCar[] = [];
  private currentPage = 1;
  private readonly ITEMS_PER_PAGE = 10;
  private totalWinners = 0;
  private sortBy: WinnersSortBy = "time";
  private sortOrder: SortOrder = "ASC";
  private container: HTMLElement;

  constructor() {
    this.container = document.createElement("div");
    this.container.className = "winners-container";
    this.container.innerHTML = "<p>Loading winners...</p>";
  }

  public async render(): Promise<HTMLElement> {
    await this.loadWinners();
    return this.container;
  }

  public prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  public nextPage(): void {
    if (this.currentPage * this.ITEMS_PER_PAGE < this.totalWinners) {
      this.currentPage++;
    }
  }

  public setSort(sortBy: WinnersSortBy): void {
    // Toggle if same column, otherwise set new sort with default ASC
    if (this.sortBy === sortBy) {
      this.sortOrder = this.sortOrder === "ASC" ? "DESC" : "ASC";
    } else {
      this.sortBy = sortBy;
      this.sortOrder = "ASC";
    }

    const headers = this.container.querySelectorAll(".sortable");
    headers.forEach((header) => {
      const sortType = header.getAttribute("data-sort");
      header.classList.toggle("sorted", sortType === sortBy);
    });

    this.loadWinners();
  }

  private async loadWinners(): Promise<void> {
    try {
      // Use the static method to fetch winners
      const response = await RaceApi.getWinners(
        this.currentPage,
        this.ITEMS_PER_PAGE,
        this.sortBy,
        this.sortOrder
      );

      const { items: winners, count: total } = response;
      this.totalWinners = Number(total);

      // Map basic winners to WinnerWithCar by fetching car details
      this.winners = await Promise.all(
        winners.map(async (winner) => {
          try {
            const car = await RaceApi.getCarById(winner.id);
            return {
              id: winner.id,
              wins: winner.wins,
              time: Number(winner.time),
              car: {
                id: car.id,
                name: car.name,
                color: car.color,
              },
            };
          } catch (error) {
            console.error(`Failed to load car ${winner.id}:`, error);
            return null;
          }
        })
      ).then((results) => results.filter(Boolean) as WinnerWithCar[]);

      this.totalWinners = total;
      this.updateView();
    } catch (error) {
      console.error("Failed to load winners:", error);
      this.container.innerHTML = "<p>Error loading winners</p>";
    }
  }

  private updateView(): void {
    this.container.innerHTML = `
      <h2>Winners (${this.totalWinners})</h2>
      <table class="winners-table">
        <thead>
          <tr>
            <th>№</th>
            <th>Car</th>
            <th>Name</th>
            <th class="sortable ${this.sortBy === "wins" ? "sorted" : ""}" data-sort="wins">
              Wins ${this.getSortArrow("wins")}
            </th>
            <th class="sortable ${this.sortBy === "time" ? "sorted" : ""}" data-sort="time">
              Best Time (s) ${this.getSortArrow("time")}
            </th>
          </tr>
        </thead>
        <tbody>
          ${this.winners.map((winner, index) => this.renderWinnerRow(winner, index)).join("")}
        </tbody>
      </table>
      ${this.renderPagination()}
    `;
    this.addEventListeners();
  }

  private getSortArrow(sortBy: WinnersSortBy): string {
    if (this.sortBy === sortBy) {
      return this.sortOrder === "ASC" ? "↑" : "↓";
    }
    return "";
  }

  private renderPagination(): string {
    const hasPrev = this.currentPage > 1;
    const hasNext = this.currentPage * this.ITEMS_PER_PAGE < this.totalWinners;

    return `
      <div class="pagination">
        <button id="winners-prev" ${!hasPrev ? "disabled" : ""}>← Prev</button>
        <span id="page-num">Page #${this.currentPage}</span>
        <button id="winners-next" ${!hasNext ? "disabled" : ""}>Next →</button>
        <button id="refresh-winners">Refresh</button>
        </div>
    `;
  }

  private renderWinnerRow(winner: WinnerWithCar, index: number): string {
    // Calculate position based on current page
    const position = (this.currentPage - 1) * this.ITEMS_PER_PAGE + index + 1;
    // Fix time calculation - ensure it's displayed in seconds with 2 decimal places
    const timeInSeconds = Number(winner.time).toFixed(2);

    return `
      <tr>
        <td>${position}</td>
        <td>
          <div class="car-icon" style="color: ${winner.car.color}">
            ${this.getCarSVG()}
          </div>
        </td>
        <td>${winner.car.name}</td>
        <td>${winner.wins}</td>
        <td>${timeInSeconds}</td>
      </tr>
    `;
  }

  private getCarSVG(): string {
    return `<svg width="50" height="20" viewBox="0 0 100 40">
      <rect x="10" y="15" width="80" height="10" fill="currentColor"/>
      <rect x="20" y="5" width="60" height="10" fill="currentColor"/>
      <circle cx="25" cy="30" r="5" fill="#333"/>
      <circle cx="75" cy="30" r="5" fill="#333"/>
    </svg>`;
  }

  private addEventListeners(): void {
    // Sorting
    const sortableHeaders =
      this.container.querySelectorAll<HTMLElement>(".sortable");
    sortableHeaders.forEach((header) => {
      header.addEventListener("click", () => {
        const sortBy = header.dataset.sort as WinnersSortBy;

        // Remove existing sort classes
        sortableHeaders.forEach((h) => {
          h.classList.remove("sorted-asc", "sorted-desc");
        });

        if (this.sortBy === sortBy) {
          // Toggle order if same column
          this.sortOrder = this.sortOrder === "ASC" ? "DESC" : "ASC";
        } else {
          // New column - set to ASC by default
          this.sortBy = sortBy;
          this.sortOrder = "ASC";
        }

        // Add appropriate sort class
        header.classList.add(
          this.sortOrder === "ASC" ? "sorted-asc" : "sorted-desc"
        );

        this.loadWinners();
      });
    });

    // Pagination
    const prevButton = this.container.querySelector("#winners-prev");
    const nextButton = this.container.querySelector("#winners-next");

    prevButton?.addEventListener("click", async () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        await this.loadWinners();
      }
    });

    nextButton?.addEventListener("click", async () => {
      const totalPages = Math.ceil(this.totalWinners / this.ITEMS_PER_PAGE);
      console.log(
        "Current page:",
        this.currentPage,
        "Total pages:",
        totalPages
      ); // Debug log
      if (this.currentPage < totalPages) {
        this.currentPage++;
        await this.loadWinners();
      }
    });

    // Refresh button
    const refreshButton = this.container.querySelector("#refresh-winners");
    refreshButton?.addEventListener("click", async () => {
      try {
        await this.loadWinners();
      } catch (error) {
        console.error("Error refreshing winners:", error);
      }
    });
  }

  public async refresh(): Promise<void> {
    await this.loadWinners();
  }
}
