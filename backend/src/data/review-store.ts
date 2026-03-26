let activeDriver: "mongo" | "memory" = "memory";

export function setReviewDriver(driver: "mongo" | "memory") {
  activeDriver = driver;
}

export function getReviewDriver() {
  return activeDriver;
}
