import {HelsiAvailabilityService} from "@/src/lib/helsi/availability";

let availabilityService: HelsiAvailabilityService | null = null;

export function getHelsiAvailabilityService() {
  if (!availabilityService) {
    availabilityService = new HelsiAvailabilityService();
  }

  return availabilityService;
}
