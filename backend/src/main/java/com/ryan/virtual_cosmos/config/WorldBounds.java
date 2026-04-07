package com.ryan.virtual_cosmos.config;

public final class WorldBounds {

    public static final double WIDTH = 2000.0;
    public static final double HEIGHT = 2000.0;
    public static final double PLAYER_RADIUS = 20.0;

    public static final double MIN_X = PLAYER_RADIUS;
    public static final double MIN_Y = PLAYER_RADIUS;
    public static final double MAX_X = WIDTH - PLAYER_RADIUS;
    public static final double MAX_Y = HEIGHT - PLAYER_RADIUS;

    private WorldBounds() {
    }

    public static double clampX(double x) {
        return Math.max(MIN_X, Math.min(MAX_X, x));
    }

    public static double clampY(double y) {
        return Math.max(MIN_Y, Math.min(MAX_Y, y));
    }
}
