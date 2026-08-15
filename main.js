const { app, BrowserWindow, Menu, screen } = require("electron");
const fs = require("fs");
const path = require("path");

function createWindow() {

    // -----------------------------
    // Settings file
    // -----------------------------

    const settingsPath = path.join(
        app.getPath("userData"),
        "settings.json"
    );

    // -----------------------------
    // Read saved position
    // -----------------------------

    let savedPosition = null;

    if (fs.existsSync(settingsPath)) {
        try {
            const settings = JSON.parse(
                fs.readFileSync(settingsPath, "utf-8")
            );

            if (
                typeof settings.x === "number" &&
                typeof settings.y === "number"
            ) {
                savedPosition = [
                    settings.x,
                    settings.y
                ];
            }

        } catch (error) {
            console.log("Could not read settings:", error);
        }
    }

    // -----------------------------
    // Create Electron window
    // -----------------------------

    const window = new BrowserWindow({
        width: 154,
        height: 182,

        frame: false,
        resizable: false,
        transparent: true,

        ...(savedPosition && {
            x: savedPosition[0],
            y: savedPosition[1]
        })
    });

    window.loadFile("index.html");

    // -----------------------------
    // Grid settings
    // -----------------------------

    const GRID_SIZE = 10;

    const LEFT_BORDER = 10;
    const TOP_BORDER = 10;
    const RIGHT_BORDER = 0;
    const BOTTOM_BORDER = 0;

    let snapTimer = null;
    let snapping = false;

    // -----------------------------
    // Keep widget inside desktop
    // -----------------------------

    window.on("will-move", (event, newBounds) => {

        const display = screen.getDisplayNearestPoint({
            x: newBounds.x + newBounds.width / 2,
            y: newBounds.y + newBounds.height / 2
        });

        const area = display.workArea;

        const minX = area.x + LEFT_BORDER;
        const minY = area.y + TOP_BORDER;

        const maxX =
            area.x +
            area.width -
            newBounds.width -
            RIGHT_BORDER;

        const maxY =
            area.y +
            area.height -
            newBounds.height -
            BOTTOM_BORDER;

        if (
            newBounds.x < minX ||
            newBounds.x > maxX ||
            newBounds.y < minY ||
            newBounds.y > maxY
        ) {
            event.preventDefault();
        }
    });

    // -----------------------------
    // Widget moved
    // -----------------------------

    window.on("moved", () => {

        if (snapping) {
            return;
        }

        clearTimeout(snapTimer);

        snapTimer = setTimeout(() => {

            snapToGrid();

        }, 100);
    });

    // -----------------------------
    // Snap widget to grid
    // -----------------------------

    function snapToGrid() {

        if (snapping) {
            return;
        }

        const [x, y] = window.getPosition();

        const [width, height] = window.getSize();

        const display = screen.getDisplayNearestPoint({
            x: x + width / 2,
            y: y + height / 2
        });

        const area = display.workArea;

        // Allowed area

        const left = area.x + LEFT_BORDER;

        const top = area.y + TOP_BORDER;

        const right =
            area.x +
            area.width -
            width -
            RIGHT_BORDER;

        const bottom =
            area.y +
            area.height -
            height -
            BOTTOM_BORDER;

        // -----------------------------
        // Normal 10px grid
        // -----------------------------

        let newX =
            left +
            Math.round(
                (x - left) / GRID_SIZE
            ) * GRID_SIZE;

        let newY =
            top +
            Math.round(
                (y - top) / GRID_SIZE
            ) * GRID_SIZE;

        // -----------------------------
        // Snap to edges
        // -----------------------------

        if (Math.abs(x - left) <= GRID_SIZE) {
            newX = left;
        }

        if (Math.abs(x - right) <= GRID_SIZE) {
            newX = right;
        }

        if (Math.abs(y - top) <= GRID_SIZE) {
            newY = top;
        }

        if (Math.abs(y - bottom) <= GRID_SIZE) {
            newY = bottom;
        }

        // -----------------------------
        // Final safety limits
        // -----------------------------

        newX = Math.max(
            left,
            Math.min(newX, right)
        );

        newY = Math.max(
            top,
            Math.min(newY, bottom)
        );

        // -----------------------------
        // Move and save
        // -----------------------------

        if (newX === x && newY === y) {

            savePosition(x, y);

            return;
        }

        snapping = true;

        window.setPosition(
            newX,
            newY
        );

        // Save final position

        savePosition(
            newX,
            newY
        );

        setTimeout(() => {
            snapping = false;
        }, 50);
    }

    // -----------------------------
    // Save widget position
    // -----------------------------

    function savePosition(x, y) {

        try {

            fs.writeFileSync(
                settingsPath,
                JSON.stringify(
                    {
                        x: x,
                        y: y
                    },
                    null,
                    2
                )
            );

        } catch (error) {

            console.log(
                "Could not save position:",
                error
            );
        }
    }
}

// -----------------------------
// Start Electron
// -----------------------------

app.whenReady().then(() => {

    // Remove File / Edit / View / Window
    Menu.setApplicationMenu(null);

    createWindow();
});