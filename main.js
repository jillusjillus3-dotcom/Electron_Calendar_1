const {
    app,
    BrowserWindow,
    Menu,
    screen,
    ipcMain
} = require("electron");

const fs = require("fs");
const path = require("path");


// ============================================
// CREATE WINDOW
// ============================================

function createWindow() {

    // ----------------------------------------
    // Settings file
    // ----------------------------------------

    const settingsPath = path.join(
        app.getPath("userData"),
        "settings.json"
    );


    // ----------------------------------------
    // Window size
    // ----------------------------------------

    const WINDOW_WIDTH = 154;
    const WINDOW_HEIGHT = 182;


    // ----------------------------------------
    // Position rules
    // ----------------------------------------

    const GRID_SIZE = 10;

    const LEFT_BORDER = 10;
    const TOP_BORDER = 10;
    const RIGHT_BORDER = 10;
    const BOTTOM_BORDER = 10;


    // ============================================
    // READ SAVED POSITION
    // ============================================

    let savedPosition = null;

    if (fs.existsSync(settingsPath)) {

        try {

            const settings = JSON.parse(
                fs.readFileSync(
                    settingsPath,
                    "utf-8"
                )
            );

            if (
                typeof settings.x === "number" &&
                typeof settings.y === "number"
            ) {

                savedPosition = {
                    x: settings.x,
                    y: settings.y
                };
            }

        } catch (error) {

            console.log(
                "Could not read saved position."
            );
        }
    }


    // ============================================
    // CREATE WINDOW
    // ============================================

    const window = new BrowserWindow({

        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,

        frame: false,

        resizable: false,

        transparent: true,

        webPreferences: {

            preload: path.join(
                __dirname,
                "preload.js"
            ),

            contextIsolation: true,

            nodeIntegration: false
        },

        // Use saved position if available
        ...(savedPosition && {
            x: savedPosition.x,
            y: savedPosition.y
        })
    });


    // ============================================
    // LOAD HTML
    // ============================================

    window.loadFile("index.html");


    // ============================================
    // RIGHT CLICK MENU
    // ============================================

    window.webContents.on(
        "context-menu",
        (event) => {

            event.preventDefault();

            const contextMenu =
                Menu.buildFromTemplate([

                    {
                        label: "Close",

                        click: () => {
                            window.close();
                        }
                    }

                ]);

            contextMenu.popup();
        }
    );


    // ============================================
    // GET ALLOWED DESKTOP AREA
    // ============================================

    function getAllowedArea(x, y) {

        const display =
            screen.getDisplayNearestPoint({

                x:
                    x +
                    WINDOW_WIDTH / 2,

                y:
                    y +
                    WINDOW_HEIGHT / 2
            });


        const area =
            display.workArea;


        return {

            minX:
                area.x +
                LEFT_BORDER,

            minY:
                area.y +
                TOP_BORDER,

            maxX:
                area.x +
                area.width -
                WINDOW_WIDTH -
                RIGHT_BORDER,

            maxY:
                area.y +
                area.height -
                WINDOW_HEIGHT -
                BOTTOM_BORDER
        };
    }


    // ============================================
    // VALIDATE SAVED POSITION
    // ============================================

    function getSafePosition(x, y) {

        const bounds =
            getAllowedArea(x, y);


        return {

            x: Math.max(
                bounds.minX,
                Math.min(
                    x,
                    bounds.maxX
                )
            ),

            y: Math.max(
                bounds.minY,
                Math.min(
                    y,
                    bounds.maxY
                )
            )
        };
    }


    // ============================================
    // FIX SAVED POSITION ON STARTUP
    // ============================================

    if (savedPosition) {

        const safePosition =
            getSafePosition(
                savedPosition.x,
                savedPosition.y
            );


        if (
            safePosition.x !== savedPosition.x ||
            safePosition.y !== savedPosition.y
        ) {

            window.setPosition(
                safePosition.x,
                safePosition.y
            );

            savePosition(
                safePosition.x,
                safePosition.y
            );
        }
    }


    // ============================================
    // DRAG VARIABLES
    // ============================================

    let isDragging = false;

    let dragOffsetX = 0;
    let dragOffsetY = 0;


    // ============================================
    // START DRAG
    // ============================================

    ipcMain.on(
        "start-drag",
        (event, mousePosition) => {

            const [
                windowX,
                windowY
            ] = window.getPosition();


            dragOffsetX =
                mousePosition.x -
                windowX;


            dragOffsetY =
                mousePosition.y -
                windowY;


            isDragging = true;
        }
    );


    // ============================================
    // DRAG
    // ============================================

    ipcMain.on(
        "drag",
        (event, mousePosition) => {

            if (!isDragging) {
                return;
            }


            let newX =
                mousePosition.x -
                dragOffsetX;


            let newY =
                mousePosition.y -
                dragOffsetY;


            // ------------------------------------
            // Keep inside desktop
            // ------------------------------------

            const bounds =
                getAllowedArea(
                    newX,
                    newY
                );


            newX = Math.max(
                bounds.minX,
                Math.min(
                    newX,
                    bounds.maxX
                )
            );


            newY = Math.max(
                bounds.minY,
                Math.min(
                    newY,
                    bounds.maxY
                )
            );


            // ------------------------------------
            // Move
            // ------------------------------------

            window.setPosition(
                Math.round(newX),
                Math.round(newY)
            );
        }
    );


    // ============================================
    // STOP DRAG
    // ============================================

    ipcMain.on(
        "stop-drag",
        () => {

            if (!isDragging) {
                return;
            }


            isDragging = false;


            const [
                x,
                y
            ] = window.getPosition();


            // Snap only after releasing
            snapToGrid(x, y);
        }
    );


    // ============================================
    // SNAP TO GRID
    // ============================================

    function snapToGrid(x, y) {

        const display =
            screen.getDisplayNearestPoint({

                x:
                    x +
                    WINDOW_WIDTH / 2,

                y:
                    y +
                    WINDOW_HEIGHT / 2
            });


        const area =
            display.workArea;


        // ------------------------------------
        // Exact allowed edges
        // ------------------------------------

        const left =
            area.x +
            LEFT_BORDER;


        const top =
            area.y +
            TOP_BORDER;


        const right =
            area.x +
            area.width -
            WINDOW_WIDTH -
            RIGHT_BORDER;


        const bottom =
            area.y +
            area.height -
            WINDOW_HEIGHT -
            BOTTOM_BORDER;


        // ------------------------------------
        // 10px grid
        // ------------------------------------

        let newX =
            left +
            Math.round(
                (x - left) /
                GRID_SIZE
            ) *
            GRID_SIZE;


        let newY =
            top +
            Math.round(
                (y - top) /
                GRID_SIZE
            ) *
            GRID_SIZE;


        // ------------------------------------
        // Give borders priority
        // ------------------------------------

        if (
            Math.abs(x - left) <=
            GRID_SIZE
        ) {

            newX = left;
        }


        if (
            Math.abs(x - right) <=
            GRID_SIZE
        ) {

            newX = right;
        }


        if (
            Math.abs(y - top) <=
            GRID_SIZE
        ) {

            newY = top;
        }


        if (
            Math.abs(y - bottom) <=
            GRID_SIZE
        ) {

            newY = bottom;
        }


        // ------------------------------------
        // Final safety limits
        // ------------------------------------

        newX = Math.max(
            left,
            Math.min(
                newX,
                right
            )
        );


        newY = Math.max(
            top,
            Math.min(
                newY,
                bottom
            )
        );


        // ------------------------------------
        // Move to final position
        // ------------------------------------

        window.setPosition(
            Math.round(newX),
            Math.round(newY)
        );


        // ------------------------------------
        // Save final position
        // ------------------------------------

        savePosition(
            Math.round(newX),
            Math.round(newY)
        );
    }


    // ============================================
    // SAVE POSITION
    // ============================================

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
                "Could not save position."
            );
        }
    }
}


// ============================================
// START ELECTRON
// ============================================

app.whenReady().then(() => {

    // Remove:
    // File
    // Edit
    // View
    // Window

    Menu.setApplicationMenu(null);

    createWindow();
});