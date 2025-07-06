import { Car as CarType } from "@/types";

export class Car {
  private element: HTMLElement;

  constructor(private car: CarType) {
    this.element = document.createElement("div");
    this.element.id = `car-${car.id}`;
    this.element.className = "car";
    this.render();
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="car-wrapper" style="color: ${this.car.color}">
        <span class="car-name">${this.car.name}</span>
        <!-- Car SVG here -->
      </div>
    `;
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
