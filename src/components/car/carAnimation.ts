import { Car as CarType } from "@/types";
import RaceApi from "@/api/raceApi";

export class CarAnimation {
  private animationId?: number;
  private finished = false;
  private isRunning = false;
  private currentPosition = 0;
  private engineStarted = false;
  private distance = 0;
  private trackElement: HTMLElement | null;
  private finishElement: HTMLElement | null;
  private trackLength: number;

  constructor(
    private element: HTMLElement,
    private car: CarType,
    initialTrackLength: number
  ) {
    if (!element) {
      throw new Error(`Car element for car ${car.id} not provided`);
    }

    this.trackElement = this.element.closest(".track");
    this.finishElement =
      this.trackElement?.querySelector(".finish-line") ?? null;
    this.trackLength = initialTrackLength;
    this.calculateTrackLength();

    window.addEventListener("resize", this.handleResize.bind(this));
  }

  private handleResize() {
    this.calculateTrackLength();
    if (this.isRunning) {
      // Restart animation from current position
      this.animateFromCurrentPosition();
    }
  }

  private calculateTrackLength(): void {
    if (this.trackElement && this.finishElement) {
      const trackRect = this.trackElement.getBoundingClientRect();
      const finishRect = this.finishElement.getBoundingClientRect();
      this.trackLength = finishRect.left - trackRect.left;
    }
  }

  private animateFromCurrentPosition() {
    if (!this.isRunning) return;

    const progress = this.currentPosition / this.trackLength;
    const remainingDistance = this.trackLength - this.currentPosition;
    const duration =
      (remainingDistance / this.distance) *
      (this.distance / (this.distance / this.trackLength));

    this.animate(duration, progress);
  }

  public hasFinished(): boolean {
    return this.finished;
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      this.isRunning = true;
      this.finished = false;
      this.currentPosition = 0;
      this.engineStarted = false;

      const { velocity, distance } = await RaceApi.controlEngine(
        this.car.id,
        "started"
      );

      this.distance = distance;
      this.engineStarted = true;
      this.animate(distance / velocity);

      try {
        await RaceApi.switchToDrive(this.car.id);
      } catch (driveError) {
        console.warn(`Drive mode warning for car ${this.car.id}:`, driveError);
        this.isRunning = false;
      }
    } catch (error) {
      console.error("Failed to start car:", error);
      this.stop(false);
    }
  }

  private animate(duration: number, initialProgress = 0): void {
    const startTime = performance.now();

    const step = (timestamp: number) => {
      if (!this.isRunning || !this.engineStarted) {
        this.stop(this.currentPosition > 0);
        return;
      }

      const elapsed = timestamp - startTime;
      const progress = initialProgress + elapsed / duration;

      this.currentPosition = Math.min(
        this.trackLength,
        this.trackLength * progress
      );
      this.element.style.transform = `translateX(${this.currentPosition}px)`;

      if (progress < 1) {
        this.animationId = requestAnimationFrame(step);
      } else {
        this.finished = true;
        this.isRunning = false;
        this.stop(true);
      }
    };

    this.animationId = requestAnimationFrame(step);
  }

  public stop(keepPosition = false): void {
    window.removeEventListener("resize", this.handleResize);

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = undefined;
    }

    this.isRunning = false;
    this.engineStarted = false;
    this.element.style.transition = "transform 0.5s ease-out";

    if (!keepPosition) {
      this.currentPosition = 0;
      this.element.style.transform = "translateX(0)";
      this.finished = false;
    }
  }
}
