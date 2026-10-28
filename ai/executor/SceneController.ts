import { SceneCommand } from "@/types/commands";
import { useWorldStore } from "@/engine/store/useWorldStore";
import { ZONES_METADATA } from "@/procedural/worldData";
import { PointOfInterest, ZoneId } from "@/types/world";

const POI_LOOKUP = new Map<string, { poi: PointOfInterest; zoneId: ZoneId }>();
for (const zone of Object.values(ZONES_METADATA)) {
  for (const poi of zone.pois) {
    POI_LOOKUP.set(poi.id, { poi, zoneId: zone.id });
  }
}

/**
 * SceneController safely translates validated SceneCommands into 3D world state mutations
 * Strictly NO eval(), NO Function(), NO innerHTML.
 */
export class SceneController {
  static execute(command: SceneCommand) {
    const store = useWorldStore.getState();

    switch (command.action) {
      case "navigate":
        store.setZone(command.target);
        break;

      case "inspect": {
        // Find POI across all zones using O(1) lookup
        const match = POI_LOOKUP.get(command.target);
        if (match) {
          store.setZone(match.zoneId);
          store.setSelectedPoi(match.poi);
        }
        break;
      }

      case "transform_ocean":
        store.setOceanState(command.state);
        break;

      case "start_tour":
        store.startTour();
        break;

      case "reset_world":
        store.resetWorld();
        break;

      case "set_quality":
        store.setQualityTier(command.tier);
        break;

      case "change_environment":
        if (command.property === "speed") {
          const val = parseFloat(command.value);
          if (!isNaN(val)) {
            useWorldStore.setState({ environmentSpeed: Math.max(0.1, Math.min(3.0, val)) });
          }
        } else if (command.property === "lighting") {
          const val = parseFloat(command.value);
          if (!isNaN(val)) {
            useWorldStore.setState({ lightingIntensity: Math.max(0.2, Math.min(2.5, val)) });
          }
        }
        break;

      case "explain":
        // Handled via narration message
        break;

      case "scale_object":
        store.setPinchTelemetry(
          command.scale > 1 ? 0.85 : 0.15,
          command.scale > 1 ? "pinching_big" : command.scale < 1 ? "pinching_small" : "idle",
          command.scale
        );
        break;

      case "toggle_ar":
        store.setArMode(command.enabled);
        break;
    }
  }
}
