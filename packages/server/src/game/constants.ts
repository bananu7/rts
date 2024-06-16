// TODO include building&unit size in this distance
export const UNIT_FOLLOW_DISTANCE = 0.5;
// general accuracy when the unit assumes it has reached
// its destination
export const MAP_MOVEMENT_TOLERANCE = 1.0;
// how far the unit will run away from the idle position
// to chase an enemy that it spotted.
export const MAXIMUM_IDLE_AGGRO_RANGE = 3.5;
// maximum number of units per player
export const MAX_PLAYER_UNITS = 50;

// If we have a path, but the target is too far from its destination
export const PATH_RECOMPUTE_DISTANCE_THRESHOLD = 3;

// TODO - those should be harvester component properties
// or, harvesting range
export const HARVESTING_DISTANCE = 2;

// how many resources does a harvester carry
export const HARVESTING_RESOURCE_COUNT = 8;
